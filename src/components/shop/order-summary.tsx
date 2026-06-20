import type { ReactNode } from "react";
import { formatMoney } from "@/lib/utils";
import type { OrderBreakdown } from "@/store/cart";

/**
 * Itemized order totals (subtotal, discount, shipping, total). Used on the
 * checkout form, the payment step, and the confirmation page so the customer can
 * always see exactly what they're charged — and that a promo code applied.
 * `shippingCents = null` renders a "calculated next" placeholder.
 */
export function OrderSummary({
  subtotalCents,
  discountCents,
  shippingCents,
  totalCents,
  discountCode,
}: Omit<OrderBreakdown, "shippingCents" | "totalCents"> & {
  shippingCents: number | null;
  totalCents: number | null;
  discountCode?: string | null;
}) {
  const row = (label: ReactNode, value: ReactNode, bold = false) => (
    <div className={`flex items-center justify-between ${bold ? "text-base font-semibold" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "" : "font-medium"}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {row("Subtotal", formatMoney(subtotalCents))}
      {discountCents > 0 &&
        row(
          <span className="text-primary">Discount{discountCode ? ` (${discountCode})` : ""}</span>,
          <span className="text-primary">−{formatMoney(discountCents)}</span>,
        )}
      {row(
        "Shipping",
        shippingCents === null ? (
          <span className="text-muted-foreground">Calculated next</span>
        ) : shippingCents === 0 ? (
          "Free"
        ) : (
          formatMoney(shippingCents)
        ),
      )}
      <div className="border-t border-border pt-2">
        {row("Total", totalCents === null ? "—" : formatMoney(totalCents), true)}
      </div>
    </div>
  );
}
