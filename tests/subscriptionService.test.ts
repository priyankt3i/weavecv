import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => ({
  from: vi.fn(),
  authGetJWTToken: vi.fn(),
}));

vi.mock("../lib/neonClient", () => ({
  neonClient: {
    auth: {
      getJWTToken: neonMocks.authGetJWTToken,
    },
    from: neonMocks.from,
  },
}));

const { getCurrentSubscription } = await import("../services/subscriptionService");

const mockSubscriptionQuery = (result: unknown) => {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ maybeSingle }));
  neonMocks.from.mockReturnValue({ select });
  return { select, maybeSingle };
};

describe("subscription service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when Neon Data API schema cache has not seen the subscription table yet", async () => {
    mockSubscriptionQuery({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.user_subscriptions' in the schema cache",
      },
    });

    await expect(getCurrentSubscription()).resolves.toBeNull();
  });

  it("maps a subscription row into app subscription state", async () => {
    mockSubscriptionQuery({
      data: {
        owner_id: "user_123",
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        stripe_price_id: "price_123",
        subscription_status: "active",
        pro_enabled: true,
        cancel_at_period_end: false,
        current_period_end: "2026-06-06T00:00:00.000Z",
        created_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:00:00.000Z",
      },
      error: null,
    });

    await expect(getCurrentSubscription()).resolves.toEqual({
      ownerId: "user_123",
      status: "active",
      proEnabled: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-06-06T00:00:00.000Z",
    });
  });

  it("throws unexpected subscription lookup errors", async () => {
    const error = { code: "42501", message: "permission denied" };
    mockSubscriptionQuery({ data: null, error });

    await expect(getCurrentSubscription()).rejects.toBe(error);
  });
});
