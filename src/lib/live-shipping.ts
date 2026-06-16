import { createAdminClient } from "@/lib/supabase/admin";
import { packageWeightLb, type ShippableItem } from "@/lib/shipping";
import { getShippoRates, isShippoConfigured, type ShipTo } from "@/lib/shippo";
import { FLAT_SHIPPING_CENTS, FLAT_EXPRESS_SHIPPING_CENTS } from "@/lib/pricing";

/**
 * Live shipping rates for the checkout, in one place so the prices a customer is
 * shown are the exact ones we re-derive and bill. Uses Shippo (real USPS rates
 * to the typed address) when SHIPPO_API_TOKEN is set; otherwise falls back to
 * flat tiers so checkout always works (e.g. before the live token is added).
 */

type Db = ReturnType<typeof createAdminClient>;

export interface CheckoutRate {
  /** Stable selector the client sends back; the server re-quotes and matches it. */
  id: string;
  carrier: string; // "USPS", "FedEx", … or "Flat"
  service: string; // human label, e.g. "Priority Mail"
  amountCents: number;
  estimatedDays: number | null;
}

/** Flat tiers used whenever Shippo isn't configured or returns nothing. */
export const FLAT_RATES: CheckoutRate[] = [
  {
    id: "FLAT",
    carrier: "Flat",
    service: "Standard shipping",
    amountCents: FLAT_SHIPPING_CENTS,
    estimatedDays: null,
  },
  {
    id: "FLAT_EXPRESS",
    carrier: "Flat",
    service: "Express shipping",
    amountCents: FLAT_EXPRESS_SHIPPING_CENTS,
    estimatedDays: null,
  },
];

/** Live options to a destination (Shippo), cheapest-first — or flat tiers as a
 *  fallback. Never throws on a carrier hiccup, so checkout can't be blocked. */
export async function liveRates(db: Db, to: ShipTo, items: ShippableItem[]): Promise<CheckoutRate[]> {
  if (!isShippoConfigured()) return FLAT_RATES;
  try {
    const weightLb = await packageWeightLb(db, items);
    const rates = await getShippoRates(to, weightLb);
    if (rates.length === 0) return FLAT_RATES;
    return rates.map((r) => ({
      id: r.serviceToken,
      carrier: r.carrier,
      service: r.service,
      amountCents: r.amountCents,
      estimatedDays: r.estimatedDays,
    }));
  } catch (e) {
    console.error("Live rate lookup failed; using flat rate:", e);
    return FLAT_RATES;
  }
}

/**
 * Re-derive the rate the customer selected, server-side, so the billed amount
 * can't be tampered with from the client. Falls back to the cheapest available
 * option when the requested id isn't offered for this destination.
 */
export async function resolveRate(
  db: Db,
  to: ShipTo,
  items: ShippableItem[],
  rateId: string | undefined,
): Promise<CheckoutRate> {
  const options = await liveRates(db, to, items);
  const match = rateId ? options.find((o) => o.id === rateId) : null;
  return match ?? options[0];
}
