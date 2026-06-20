import { createAdminClient } from "@/lib/supabase/admin";
import { discountAmountCents, isDiscountValid } from "@/lib/pricing";
import type { Discount } from "@/types/db";

type Db = ReturnType<typeof createAdminClient>;

export interface ResolvedDiscount {
  /** The valid discount to apply, or null when there's no (usable) code. */
  discount: Discount | null;
  /** Amount off in cents for the given subtotal (0 when none). */
  discountCents: number;
  /** Set when a code was supplied but can't be used; a customer-facing reason. */
  error?: string;
}

/**
 * Resolve a promo code against the live `discounts` table for a given subtotal
 * and (optional) customer email. Shared by the checkout route (authoritative,
 * applies the discount) and the promo-preview route (shows "applied — $X off"
 * before paying) so the quoted and charged discounts can never drift apart.
 */
export async function resolveDiscount(
  db: Db,
  code: string | undefined | null,
  subtotalCents: number,
  email?: string,
): Promise<ResolvedDiscount> {
  if (!code) return { discount: null, discountCents: 0 };

  const { data } = await db
    .from("discounts")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  const discount = data as Discount | null;

  if (!discount || !isDiscountValid(discount, subtotalCents)) {
    return { discount: null, discountCents: 0, error: "That code isn't valid for this order." };
  }

  // Once-per-customer: reject if this email already redeemed it on a
  // paid/fulfilled order. Only checkable when the email is known.
  if (discount.once_per_customer && email) {
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("discount_id", discount.id)
      .in("status", ["paid", "fulfilled"]);
    if ((count ?? 0) > 0) {
      return { discount: null, discountCents: 0, error: "You've already used that code." };
    }
  }

  return { discount, discountCents: discountAmountCents(discount, subtotalCents) };
}
