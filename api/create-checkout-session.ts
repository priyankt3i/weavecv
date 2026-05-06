import type { VercelRequest, VercelResponse } from "./_vercelTypes.js";
import { getAppUrl, getBillingSql, getStripe, readJsonBody, verifyAuthenticatedUser } from "./_billing.js";

const getCustomerId = async (ownerId: string, email: string | null) => {
  const sql = await getBillingSql();
  const rows = await sql`
    SELECT stripe_customer_id
    FROM public.user_subscriptions
    WHERE owner_id = ${ownerId}
    LIMIT 1
  `;
  const existing = rows[0] as { stripe_customer_id?: string | null } | undefined;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: email || undefined,
    metadata: { owner_id: ownerId },
  });

  await sql`
    INSERT INTO public.user_subscriptions (owner_id, stripe_customer_id)
    VALUES (${ownerId}, ${customer.id})
    ON CONFLICT (owner_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id
  `;

  return customer.id;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await verifyAuthenticatedUser(req);
    if (!user.ok) return res.status(user.status).json({ error: user.error });

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return res.status(503).json({ error: "STRIPE_PRO_PRICE_ID is not configured." });
    }

    const body = readJsonBody(req);
    const email = typeof body.email === "string" && body.email.includes("@") ? body.email : null;
    const customerId = await getCustomerId(user.ownerId, email);
    const appUrl = getAppUrl(req);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      client_reference_id: user.ownerId,
      metadata: { owner_id: user.ownerId },
      subscription_data: {
        metadata: { owner_id: user.ownerId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    const message = error instanceof Error ? error.message : "Unable to start Stripe checkout.";
    return res.status(500).json({ error: message });
  }
}
