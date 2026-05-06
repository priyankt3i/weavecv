import type { VercelRequest, VercelResponse } from "./_vercelTypes.js";
import { getBillingSql, isProEnabledStatus, readJsonBody } from "./_billing.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = readJsonBody(req);
  const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
  if (!ownerId) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const sql = await getBillingSql();
    const rows = await sql`
      SELECT
        owner_id,
        subscription_status,
        pro_enabled,
        cancel_at_period_end,
        current_period_end
      FROM public.user_subscriptions
      WHERE owner_id = ${ownerId}
      LIMIT 1
    `;
    const row = rows[0] as
      | {
          owner_id: string;
          subscription_status: string;
          pro_enabled: boolean;
          cancel_at_period_end: boolean;
          current_period_end: Date | string | null;
        }
      | undefined;

    if (!row) {
      return res.status(200).json({ subscription: null });
    }

    return res.status(200).json({
      subscription: {
        ownerId: row.owner_id,
        status: row.subscription_status,
        proEnabled: Boolean(row.pro_enabled && isProEnabledStatus(row.subscription_status)),
        cancelAtPeriodEnd: row.cancel_at_period_end,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Failed to load subscription status:", error);
    const message = error instanceof Error ? error.message : "Unable to load subscription status.";
    return res.status(500).json({ error: message });
  }
}
