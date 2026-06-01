import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({ code: z.string().trim().min(4).max(40) });

/** Check a gift card's current balance. Redemption against an order happens
 *  atomically server-side via the `redeem_gift_card` SQL function at checkout. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const db = createAdminClient();
  const { data: card } = await db
    .from("gift_cards")
    .select("balance_cents, currency, status, expires_at")
    .eq("code", parsed.data.code.toUpperCase())
    .maybeSingle();

  if (!card || card.status === "disabled") {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }
  const expired = card.expires_at && new Date(card.expires_at) < new Date();
  if (card.status === "redeemed" || card.status === "expired" || expired) {
    return NextResponse.json({ balanceCents: 0, status: "spent" });
  }
  return NextResponse.json({ balanceCents: card.balance_cents, currency: card.currency, status: "active" });
}
