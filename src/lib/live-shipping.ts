import { createAdminClient } from "@/lib/supabase/admin";
import type { ShippableItem } from "@/lib/shipping";
import { FLAT_SHIPPING_CENTS, FLAT_EXPRESS_SHIPPING_CENTS } from "@/lib/pricing";

/**
 * Checkout shipping rates — flat tiers only (Standard $10, Express $20). The
 * live-carrier integration was removed; postage is bought manually for now and
 * the tracking number entered on the order in the admin. A direct FedEx API will
 * replace these flat tiers later. Kept as a thin module so callers are unchanged.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Destination shape callers pass for a rate quote (kept for signature parity). */
export interface ShipTo {
  name?: string | null;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface CheckoutRate {
  /** Stable selector the client sends back; the server re-quotes and matches it. */
  id: string;
  carrier: string; // "Flat"
  service: string; // human label
  amountCents: number;
  estimatedDays: number | null;
}

/** The flat tiers shown at checkout. */
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

/** Flat shipping tiers for a destination. No live-carrier lookup. */
export async function liveRates(_db: Db, _to: ShipTo, _items: ShippableItem[]): Promise<CheckoutRate[]> {
  return FLAT_RATES;
}

/**
 * Re-derive the rate the customer selected, server-side, so the billed amount
 * can't be tampered with from the client. Falls back to the cheapest tier when
 * the requested id isn't one we offer.
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
