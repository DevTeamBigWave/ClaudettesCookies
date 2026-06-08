import type { Discount } from "@/types/db";

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const FLAT_SHIPPING_CENTS = 700;

export interface PricedLine {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/** Compute the discount amount in cents for a given subtotal. Shipping-type
 * discounts return 0 here and are applied to the shipping leg instead. */
export function discountAmountCents(discount: Discount | null, subtotalCents: number): number {
  if (!discount) return 0;
  if (subtotalCents < discount.min_subtotal_cents) return 0;
  switch (discount.type) {
    case "percentage":
      return Math.round((subtotalCents * Math.min(100, discount.value)) / 100);
    case "fixed_amount":
      return Math.min(subtotalCents, discount.value);
    case "free_shipping":
      return 0;
    default:
      return 0;
  }
}

/** Returns true if the discount is currently valid (active + within window + under limit). */
export function isDiscountValid(discount: Discount, subtotalCents: number, now = new Date()): boolean {
  if (!discount.active) return false;
  if (discount.starts_at && new Date(discount.starts_at) > now) return false;
  if (discount.ends_at && new Date(discount.ends_at) < now) return false;
  if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) return false;
  if (subtotalCents < discount.min_subtotal_cents) return false;
  return true;
}

/**
 * The single source of pricing truth. Builds the full priced cart from
 * server-trusted line prices. `shippingQuoteCents` is the rate the customer
 * selected (e.g. a live FedEx service), already re-validated server-side; when
 * omitted we fall back to the flat rate. Free-shipping perks (order over the
 * threshold, or a free_shipping discount) still zero it out either way. Tax is
 * left at 0 for the MVP (Stripe Tax can be switched on later).
 */
export function priceCart(
  lines: PricedLine[],
  discount: Discount | null,
  shippingQuoteCents?: number,
): PricedCart {
  const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);
  const discountCents = discountAmountCents(discount, subtotalCents);
  const afterDiscount = subtotalCents - discountCents;

  const freeShipping =
    afterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS ||
    (discount?.type === "free_shipping" && subtotalCents >= discount.min_subtotal_cents);
  const baseShippingCents = shippingQuoteCents ?? FLAT_SHIPPING_CENTS;
  const shippingCents = lines.length === 0 || freeShipping ? 0 : baseShippingCents;

  const taxCents = 0;
  const totalCents = afterDiscount + shippingCents + taxCents;

  return { lines, subtotalCents, discountCents, shippingCents, taxCents, totalCents };
}
