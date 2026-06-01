import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { generateGiftCardCode } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  amountCents: z.number().int().min(1000).max(50000),
  purchaserEmail: z.string().email(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(120),
  message: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { amountCents, purchaserEmail, recipientEmail, recipientName, message } = parsed.data;
  const db = createAdminClient();

  // Create the card in a pending/disabled state; the webhook flips it to active
  // once payment succeeds, so an unpaid card can never be redeemed.
  const code = generateGiftCardCode();
  const { error } = await db.from("gift_cards").insert({
    code,
    initial_cents: amountCents,
    balance_cents: amountCents,
    status: "disabled",
    purchaser_email: purchaserEmail,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    gift_message: message ?? null,
  });
  if (error) {
    return NextResponse.json({ error: "Could not create gift card" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: purchaserEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: `Claudette's Gift Card for ${recipientName}` },
        },
      },
    ],
    success_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/success?giftcard=1`,
    cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/gift-cards`,
    metadata: { kind: "gift_card", gift_card_code: code },
    payment_intent_data: { metadata: { kind: "gift_card", gift_card_code: code } },
  });

  return NextResponse.json({ url: session.url });
}
