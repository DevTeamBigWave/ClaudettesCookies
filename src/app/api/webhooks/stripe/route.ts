import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { orderReceiptEmail, giftCardEmail } from "@/lib/emails";

export const runtime = "nodejs";
// Stripe needs the raw body to verify the signature — disable body parsing.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();

  // Idempotency: record the event id; if it's already there, we've handled it.
  const { error: dupErr } = await db
    .from("webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dupErr) {
    // Unique violation → already processed. Ack so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      const isGiftCard = session.metadata?.kind === "gift_card";

      if (isGiftCard) {
        await fulfillGiftCard(db, session);
      } else if (orderId) {
        await fulfillOrder(db, orderId, session);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Returning 500 makes Stripe retry; the idempotency row was inserted, so we
    // delete it to allow a clean reprocess on retry.
    await db.from("webhook_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(
  db: ReturnType<typeof createAdminClient>,
  orderId: string,
  session: Stripe.Checkout.Session,
) {
  // Atomic: mark paid + decrement inventory + roll up stats (idempotent in SQL).
  const { data: didTransition } = await db.rpc("finalize_paid_order", {
    p_order_id: orderId,
    p_payment_intent: (session.payment_intent as string) ?? "",
  });
  if (!didTransition) return; // already finalized

  // Persist shipping address if Stripe collected one.
  if (session.customer_details) {
    await db
      .from("orders")
      .update({ shipping_address: session.customer_details as unknown as Record<string, unknown> })
      .eq("id", orderId);
  }

  const { data: order } = await db
    .from("orders")
    .select("order_number, email, subtotal_cents, discount_cents, shipping_cents, total_cents")
    .eq("id", orderId)
    .single();
  const { data: items } = await db
    .from("order_items")
    .select("title, quantity, total_cents")
    .eq("order_id", orderId);

  if (order) {
    await sendEmail({
      to: order.email,
      subject: `Your Claudette's order #${order.order_number} is confirmed 🍪`,
      html: orderReceiptEmail({
        orderNumber: order.order_number,
        items: (items ?? []).map((i) => ({
          title: i.title,
          quantity: i.quantity,
          totalCents: i.total_cents,
        })),
        subtotalCents: order.subtotal_cents,
        discountCents: order.discount_cents,
        shippingCents: order.shipping_cents,
        totalCents: order.total_cents,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    }).catch((e) => console.error("Receipt email failed:", e));
  }
}

async function fulfillGiftCard(
  db: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const code = session.metadata?.gift_card_code;
  if (!code) return;

  const { data: card } = await db
    .from("gift_cards")
    .update({ status: "active" })
    .eq("code", code)
    .select("*")
    .single();
  if (!card) return;

  if (card.recipient_email) {
    await sendEmail({
      to: card.recipient_email,
      subject: `🎁 You've got a Claudette's gift card`,
      html: giftCardEmail({
        code: card.code,
        amountCents: card.initial_cents,
        recipientName: card.recipient_name ?? "friend",
        senderMessage: card.gift_message,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    }).catch((e) => console.error("Gift card email failed:", e));
  }
}
