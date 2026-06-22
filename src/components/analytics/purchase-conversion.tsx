"use client";

import { useEffect } from "react";
import { trackServerPurchase } from "@/lib/analytics";

/**
 * Fires the Google Ads conversion + GA4 purchase once, from server-verified
 * Stripe values passed by the success page. Guarded so it fires at most once per
 * transaction (payment-intent id) even across refreshes; Google also dedupes by
 * transaction_id server-side as a backstop.
 */
export function PurchaseConversion({
  transactionId,
  value,
  email,
}: {
  transactionId: string;
  value: number;
  email?: string;
}) {
  useEffect(() => {
    if (!transactionId) return;
    const key = `cc_purchase_fired_${transactionId}`;
    try {
      if (localStorage.getItem(key)) return; // already recorded this transaction
      localStorage.setItem(key, "1");
    } catch {
      /* private mode — rely on Google's transaction_id dedupe */
    }
    trackServerPurchase({ transactionId, value, email });
  }, [transactionId, value, email]);

  return null;
}
