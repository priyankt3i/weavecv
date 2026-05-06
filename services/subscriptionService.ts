import { neonClient } from "../lib/neonClient";
import type { SubscriptionRow } from "../lib/neonClient";

export type UserSubscription = {
  ownerId: string;
  status: string;
  proEnabled: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

const requireClient = () => {
  if (!neonClient) {
    throw new Error("Neon Auth and Data API are not configured.");
  }
  return neonClient;
};

const getAuthToken = async () => {
  const client = requireClient();
  const auth = client.auth as { getJWTToken?: () => Promise<string | null> };
  const token = await auth.getJWTToken?.();
  if (!token) {
    throw new Error("Sign in to manage your subscription.");
  }
  return token;
};

const toSubscription = (row: SubscriptionRow): UserSubscription => ({
  ownerId: row.owner_id,
  status: row.subscription_status,
  proEnabled: row.pro_enabled,
  cancelAtPeriodEnd: row.cancel_at_period_end,
  currentPeriodEnd: row.current_period_end,
});

const readApiError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    if (payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to the caller-facing fallback.
  }

  return fallback;
};

export const getCurrentSubscription = async (): Promise<UserSubscription | null> => {
  const client = requireClient();
  const { data, error } = await client.from("user_subscriptions").select("*").maybeSingle();

  if (error) throw error;
  return data ? toSubscription(data as SubscriptionRow) : null;
};

export const startProCheckout = async (email?: string | null): Promise<void> => {
  const token = await getAuthToken();
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to start Stripe checkout."));
  }

  const payload = await response.json();
  if (!payload || typeof payload.url !== "string") {
    throw new Error("Stripe checkout did not return a checkout URL.");
  }

  window.location.href = payload.url;
};

export const openCustomerPortal = async (): Promise<void> => {
  const token = await getAuthToken();
  const response = await fetch("/api/create-customer-portal-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to open Stripe customer portal."));
  }

  const payload = await response.json();
  if (!payload || typeof payload.url !== "string") {
    throw new Error("Stripe customer portal did not return a portal URL.");
  }

  window.location.href = payload.url;
};
