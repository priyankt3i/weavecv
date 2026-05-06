import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "./_vercelTypes.js";
import { getBillingSql, getStripe, readRawBody, upsertSubscription } from "./_billing.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const unixToDate = (value: number | null | undefined) => (value ? new Date(value * 1000) : null);

const getStringId = (value: string | { id: string } | null | undefined) => {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
};

const getSubscriptionPeriodEnd = (subscription: Stripe.Subscription) => {
  const firstItem = subscription.items.data[0];
  return unixToDate(firstItem?.current_period_end);
};

const getSubscriptionPriceId = (subscription: Stripe.Subscription) => {
  const firstItem = subscription.items.data[0];
  return firstItem?.price?.id || null;
};

const resolveOwnerId = async (subscription: Stripe.Subscription) => {
  const metadataOwnerId = subscription.metadata?.owner_id;
  if (metadataOwnerId) return metadataOwnerId;

  const subscriptionId = subscription.id;
  const customerId = getStringId(subscription.customer);
  const sql = await getBillingSql();
  const rows = await sql`
    SELECT owner_id
    FROM public.user_subscriptions
    WHERE stripe_subscription_id = ${subscriptionId}
       OR stripe_customer_id = ${customerId}
    LIMIT 1
  `;
  const row = rows[0] as { owner_id?: string } | undefined;
  return row?.owner_id || null;
};

const syncSubscription = async (subscription: Stripe.Subscription) => {
  const ownerId = await resolveOwnerId(subscription);
  if (!ownerId) {
    console.warn(`Stripe subscription ${subscription.id} has no owner_id metadata.`);
    return;
  }

  await upsertSubscription({
    ownerId,
    customerId: getStringId(subscription.customer),
    subscriptionId: subscription.id,
    priceId: getSubscriptionPriceId(subscription),
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
  });
};

const syncCheckoutSession = async (session: Stripe.Checkout.Session) => {
  const ownerId = session.client_reference_id || session.metadata?.owner_id;
  const subscriptionId = getStringId(session.subscription);
  if (!ownerId || !subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscription({
    ownerId,
    customerId: getStringId(subscription.customer),
    subscriptionId: subscription.id,
    priceId: getSubscriptionPriceId(subscription),
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is not configured." });
  }

  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ error: "Missing Stripe signature." });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);
    return res.status(400).json({ error: "Invalid Stripe webhook signature." });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Failed to process Stripe webhook:", error);
    return res.status(500).json({ error: "Failed to process Stripe webhook." });
  }
}
