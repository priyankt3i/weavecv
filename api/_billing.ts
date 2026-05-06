import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import Stripe from "stripe";
import type { VercelRequest } from "./_vercelTypes.js";

type JsonBody = Record<string, unknown>;

let stripeClient: Stripe | null = null;
let sqlClient: NeonQueryFunction<false, false> | null = null;
let billingSchemaPromise: Promise<void> | null = null;

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
};

const getDatabaseUrl = () =>
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.NEON_POSTGRES_URL;

export const getStripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
  }
  return stripeClient;
};

export const getSql = () => {
  if (!sqlClient) {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
};

const initializeBillingSchema = async () => {
  const sql = getSql();

  await sql`
    CREATE OR REPLACE FUNCTION public.current_app_user_id()
    RETURNS text AS $$
      WITH jwt AS (
        SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb AS claims
      )
      SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        claims ->> 'sub',
        claims ->> 'user_id',
        claims ->> 'owner_id'
      )
      FROM jwt;
    $$ LANGUAGE sql STABLE
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.user_subscriptions (
      owner_id text PRIMARY KEY DEFAULT public.current_app_user_id(),
      stripe_customer_id text UNIQUE,
      stripe_subscription_id text UNIQUE,
      stripe_price_id text,
      subscription_status text NOT NULL DEFAULT 'inactive',
      pro_enabled boolean NOT NULL DEFAULT false,
      cancel_at_period_end boolean NOT NULL DEFAULT false,
      current_period_end timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE public.user_subscriptions
    ALTER COLUMN owner_id SET DEFAULT public.current_app_user_id()
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS user_subscriptions_customer_idx
    ON public.user_subscriptions (stripe_customer_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS user_subscriptions_subscription_idx
    ON public.user_subscriptions (stripe_subscription_id)
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;

  await sql`
    DO $$
    BEGIN
      CREATE TRIGGER user_subscriptions_set_updated_at
      BEFORE UPDATE ON public.user_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END
    $$
  `;

  await sql`
    ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY
  `;

  await sql`
    DO $$
    BEGIN
      CREATE POLICY "Users can read their subscription"
      ON public.user_subscriptions
      FOR SELECT
      TO public
      USING (owner_id = public.current_app_user_id());
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END
    $$
  `;
};

export const ensureBillingSchema = async () => {
  if (!billingSchemaPromise) {
    billingSchemaPromise = initializeBillingSchema().catch((error: unknown) => {
      billingSchemaPromise = null;
      throw error;
    });
  }

  await billingSchemaPromise;
};

export const getBillingSql = async () => {
  await ensureBillingSchema();
  return getSql();
};

export const isProEnabledStatus = (status: string | null | undefined) => activeSubscriptionStatuses.has(status || "");

export const getAppUrl = (req: VercelRequest) => {
  const configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const normalizedHost = Array.isArray(host) ? host[0] : host;
  const normalizedProto = Array.isArray(proto) ? proto[0] : proto;

  return normalizedHost ? `${normalizedProto}://${normalizedHost}` : "http://localhost:5173";
};

export const readJsonBody = (req: VercelRequest): JsonBody => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
};

export const readRawBody = async (req: VercelRequest): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const getBearerToken = (req: VercelRequest) => {
  const header = req.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
};

const parseCurrentUserId = (payload: unknown) => {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload) && typeof payload[0] === "string") return payload[0];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.current_app_user_id === "string") return record.current_app_user_id;
    if (typeof record.owner_id === "string") return record.owner_id;
    if (typeof record.user_id === "string") return record.user_id;
  }
  return null;
};

export const verifyAuthenticatedUser = async (req: VercelRequest) => {
  const body = readJsonBody(req);
  const bodyOwnerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
  if (bodyOwnerId) {
    return { ok: true as const, ownerId: bodyOwnerId };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  const dataApiUrl = process.env.NEON_DATA_API_URL || process.env.VITE_NEON_DATA_API_URL;
  if (!dataApiUrl) {
    return { ok: false as const, status: 503, error: "Neon Data API URL is not configured on the server." };
  }

  const response = await fetch(`${dataApiUrl.replace(/\/$/, "")}/rpc/current_app_user_id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    return { ok: false as const, status: 401, error: "Your session could not be verified." };
  }

  const payload = await response.json();
  const ownerId = parseCurrentUserId(payload);
  if (!ownerId) {
    return { ok: false as const, status: 401, error: "Your session could not be verified." };
  }

  return { ok: true as const, ownerId };
};

export const verifyProRequest = async (req: VercelRequest) => {
  if ((process.env.WEAVECV_FORCE_PRO || process.env.VITE_WEAVECV_FORCE_PRO || "").toLowerCase() === "true") {
    return { ok: true as const, ownerId: "forced-pro" };
  }

  const user = await verifyAuthenticatedUser(req);
  if (!user.ok) return user;

  const sql = await getBillingSql();
  const rows = await sql`
    SELECT pro_enabled, subscription_status
    FROM public.user_subscriptions
    WHERE owner_id = ${user.ownerId}
    LIMIT 1
  `;
  const row = rows[0] as { pro_enabled?: boolean; subscription_status?: string } | undefined;

  if (!row?.pro_enabled || !isProEnabledStatus(row.subscription_status)) {
    return { ok: false as const, status: 402, error: "WeaveCV Pro is required for AI features." };
  }

  return { ok: true as const, ownerId: user.ownerId };
};

export const upsertSubscription = async ({
  ownerId,
  customerId,
  subscriptionId,
  priceId,
  status,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: {
  ownerId: string;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
}) => {
  const sql = await getBillingSql();
  await sql`
    INSERT INTO public.user_subscriptions (
      owner_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      subscription_status,
      pro_enabled,
      cancel_at_period_end,
      current_period_end
    )
    VALUES (
      ${ownerId},
      ${customerId},
      ${subscriptionId},
      ${priceId},
      ${status},
      ${isProEnabledStatus(status)},
      ${cancelAtPeriodEnd},
      ${currentPeriodEnd}
    )
    ON CONFLICT (owner_id) DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.user_subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.user_subscriptions.stripe_subscription_id),
      stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, public.user_subscriptions.stripe_price_id),
      subscription_status = EXCLUDED.subscription_status,
      pro_enabled = EXCLUDED.pro_enabled,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      current_period_end = EXCLUDED.current_period_end
  `;
};
