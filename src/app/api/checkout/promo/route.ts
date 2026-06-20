import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDiscount } from "@/lib/discounts";
import { formatMoney } from "@/lib/utils";

export const runtime = "nodejs";

// Live promo-code preview for the checkout form. Re-prices the subtotal from the
// DB (never trusts client prices) and runs the exact same validation the real
// checkout does, so "applied — $X off" matches what's charged.
const Body = z.object({
  code: z.string().trim().min(1).max(40),
  email: z.string().email().optional(),
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, message: "Enter a promo code." });
  }
  const { code, email, items } = parsed.data;

  const db = createAdminClient();
  const { data: variants } = await db
    .from("product_variants")
    .select("id, price_cents")
    .in(
      "id",
      items.map((i) => i.variantId),
    );

  const priceById = new Map((variants ?? []).map((v) => [v.id as string, v.price_cents as number]));
  const subtotalCents = items.reduce((s, i) => s + (priceById.get(i.variantId) ?? 0) * i.quantity, 0);

  const { discount, discountCents, error } = await resolveDiscount(db, code, subtotalCents, email);
  if (error || !discount) {
    return NextResponse.json({ valid: false, message: error ?? "That code isn't valid for this order." });
  }

  return NextResponse.json({
    valid: true,
    code: discount.code,
    discountCents,
    message: `Applied — ${formatMoney(discountCents)} off`,
  });
}
