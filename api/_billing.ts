import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import Stripe from "stripe";
import type { VercelRequest } from "./_vercelTypes.js";

type JsonBody = Record<string, unknown>;

let stripeClient: Stripe | null = null;
let sqlClient: NeonQueryFunction<false, false> | null = null;

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

  const sql = getSql();
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
  const sql = getSql();
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
