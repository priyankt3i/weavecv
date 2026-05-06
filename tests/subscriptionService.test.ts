import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSubscription, openCustomerPortal, startProCheckout } from "../services/subscriptionService";

const mockFetch = vi.fn();
const locationValue = { href: "https://weavecv.test/" };

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: mockFetch,
});

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: locationValue,
  },
});

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 500) =>
  ({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("subscription service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationValue.href = "https://weavecv.test/";
  });

  it("returns null without a signed-in owner id", async () => {
    await expect(getCurrentSubscription(null)).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("loads subscription status through the server API instead of querying Neon Data API from the browser", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        subscription: {
          ownerId: "user_123",
          status: "active",
          proEnabled: true,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: "2026-06-06T00:00:00.000Z",
        },
      })
    );

    await expect(getCurrentSubscription("user_123")).resolves.toEqual({
      ownerId: "user_123",
      status: "active",
      proEnabled: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-06-06T00:00:00.000Z",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/subscription-status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ownerId: "user_123" }),
      })
    );
  });

  it("opens checkout with the current WeaveCV owner id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ url: "https://checkout.stripe.test/session" }));

    await startProCheckout("user_123", "person@example.com");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/create-checkout-session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ownerId: "user_123", email: "person@example.com" }),
      })
    );
    expect(locationValue.href).toBe("https://checkout.stripe.test/session");
  });

  it("opens the customer portal with the current WeaveCV owner id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ url: "https://billing.stripe.test/session" }));

    await openCustomerPortal("user_123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/create-customer-portal-session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ownerId: "user_123" }),
      })
    );
    expect(locationValue.href).toBe("https://billing.stripe.test/session");
  });
});
