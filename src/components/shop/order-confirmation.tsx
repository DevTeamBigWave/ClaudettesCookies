"use client";

import { useEffect, useState } from "react";
import { useCart, type LastOrder } from "@/store/cart";
import { OrderSummary } from "@/components/shop/order-summary";
import { formatMoney } from "@/lib/utils";

/**
 * Shows the just-placed order's items + breakdown on the confirmation page, then
 * clears the cart, promo, and snapshot. Snapshots the order on mount so the
 * clear doesn't blank what we're rendering. Renders nothing if there's no
 * snapshot (e.g. the page was opened directly) — the emailed receipt is still
 * the authoritative record.
 */
export function OrderConfirmation() {
  const storedLastOrder = useCart((s) => s.lastOrder);
  const clear = useCart((s) => s.clear);
  const clearLastOrder = useCart((s) => s.clearLastOrder);
  const [order, setOrder] = useState<LastOrder | null>(null);

  useEffect(() => {
    setOrder(storedLastOrder);
    clear();
    clearLastOrder();
    // Run once on mount; storedLastOrder is captured from the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) return null;

  return (
    <div className="mt-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-left">
      <h2 className="mb-4 font-display text-lg font-semibold">Order summary</h2>
      <ul className="mb-4 space-y-2">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-3 text-sm">
            <span>
              {it.quantity}× {it.title}
              {it.variantTitle ? (
                <span className="block text-xs text-muted-foreground">{it.variantTitle}</span>
              ) : null}
            </span>
            <span className="font-medium">{formatMoney(it.totalCents)}</span>
          </li>
        ))}
      </ul>
      <OrderSummary
        subtotalCents={order.breakdown.subtotalCents}
        discountCents={order.breakdown.discountCents}
        shippingCents={order.breakdown.shippingCents}
        totalCents={order.breakdown.totalCents}
      />
    </div>
  );
}
