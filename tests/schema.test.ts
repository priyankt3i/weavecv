import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaSql = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");

describe("database schema", () => {
  it("does not depend on a missing auth schema helper", () => {
    expect(schemaSql).not.toContain("auth.user_id()");
    expect(schemaSql).toContain("CREATE OR REPLACE FUNCTION public.current_app_user_id()");
  });

  it("creates the subscription table used by Stripe and the app", () => {
    expect(schemaSql).toContain("CREATE TABLE IF NOT EXISTS public.user_subscriptions");
    expect(schemaSql).toContain("stripe_customer_id text UNIQUE");
    expect(schemaSql).toContain("stripe_subscription_id text UNIQUE");
    expect(schemaSql).toContain("subscription_status text NOT NULL DEFAULT 'inactive'");
    expect(schemaSql).toContain("pro_enabled boolean NOT NULL DEFAULT false");
  });

  it("keeps user-owned rows protected by RLS policies", () => {
    expect(schemaSql).toContain("ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY");
    expect(schemaSql).toContain("ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY");
    expect(schemaSql).toContain("USING (owner_id = public.current_app_user_id())");
    expect(schemaSql).toContain("WITH CHECK (owner_id = public.current_app_user_id())");
  });
});
