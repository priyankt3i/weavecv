export type UserSubscription = {
  ownerId: string;
  status: string;
  proEnabled: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

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

export const getCurrentSubscription = async (ownerId?: string | null): Promise<UserSubscription | null> => {
  if (!ownerId) return null;

  const response = await fetch("/api/subscription-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ownerId }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload?.subscription ?? null;
};

export const startProCheckout = async (ownerId: string, email?: string | null): Promise<void> => {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ownerId, email }),
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

export const openCustomerPortal = async (ownerId: string): Promise<void> => {
  const response = await fetch("/api/create-customer-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ownerId }),
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
