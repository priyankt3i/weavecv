import type { VercelRequest, VercelResponse } from "./_vercelTypes.js";
import { getAppUrl, getBillingSql, getStripe, verifyAuthenticatedUser } from "./_billing.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await verifyAuthenticatedUser(req);
    if (!user.ok) return res.status(user.status).json({ error: user.error });

    const sql = await getBillingSql();
    const rows = await sql`
      SELECT stripe_customer_id
      FROM public.user_subscriptions
      WHERE owner_id = ${user.ownerId}
      LIMIT 1
    `;
    const subscription = rows[0] as { stripe_customer_id?: string | null } | undefined;

    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ error: "No Stripe customer exists for this account yet." });
    }

    const appUrl = getAppUrl(req);
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Failed to create Stripe portal session:", error);
    const message = error instanceof Error ? error.message : "Unable to open Stripe customer portal.";
    return res.status(500).json({ error: message });
  }
}
