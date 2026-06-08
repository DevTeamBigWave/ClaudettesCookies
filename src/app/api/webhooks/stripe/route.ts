import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { orderReceiptEmail, giftCardEmail } from "@/lib/emails";
import { createCalendarEvent, deleteCalendarEvent, bakeDayYmd } from "@/lib/google-calendar";
import { formatMoney } from "@/lib/utils";

export const runtime = "nodejs";
// Stripe needs the raw body to verify the signature — disable body parsing.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook called but STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

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
    } else if (event.type === "charge.refunded") {
      await refundOrder(db, event.data.object as Stripe.Charge);
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

    // Mirror the paid order onto Google Calendar. No-ops when the integration
    // isn't connected; best-effort, so a failure never blocks fulfillment.
    try {
      const customer = session.customer_details?.name ?? order.email;
      const itemLines = (items ?? []).map((i) => `${i.quantity}× ${i.title}`).join("\n");
      const eventId = await createCalendarEvent({
        summary: `🍪 Order #${order.order_number} — ${customer}`,
        description:
          `${itemLines}\n\n` +
          `Total: ${formatMoney(order.total_cents)}\n` +
          `Customer: ${customer} <${order.email}>\n` +
          `${env.NEXT_PUBLIC_SITE_URL}/admin/orders`,
        // Bake day = the day after the order is placed, 8–11am store time.
        date: bakeDayYmd(new Date()),
      });
      if (eventId) {
        await db.from("orders").update({ google_event_id: eventId }).eq("id", orderId);
      }
    } catch (e) {
      console.error("Calendar sync failed:", e);
    }
  }
}

/**
 * A refund came back from Stripe. On a *full* refund, mark the order refunded
 * and remove the order's mirrored calendar event so it doesn't linger. Partial
 * refunds are left alone (the order is still partly live).
 */
async function refundOrder(db: ReturnType<typeof createAdminClient>, charge: Stripe.Charge) {
  if (!charge.refunded) return; // false for partial refunds

  // The order id rides along on the charge metadata (set via payment_intent_data
  // at checkout); fall back to matching the payment intent if it's absent.
  let orderId = charge.metadata?.order_id;
  if (!orderId && charge.payment_intent) {
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", charge.payment_intent as string)
      .maybeSingle();
    orderId = data?.id;
  }
  if (!orderId) return;

  const { data: order } = await db
    .from("orders")
    .select("id, google_event_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  if (order.google_event_id) {
    try {
      await deleteCalendarEvent(order.google_event_id);
    } catch (e) {
      console.error("Calendar event delete failed:", e);
    }
  }

  await db.from("orders").update({ status: "refunded", google_event_id: null }).eq("id", orderId);
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
