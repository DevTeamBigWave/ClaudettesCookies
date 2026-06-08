import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFedExRates,
  isFedExConfigured,
  splitTiers,
  type ShippingOption,
  type TieredShippingOption,
} from "@/lib/fedex";
import { FLAT_SHIPPING_CENTS, FLAT_EXPRESS_SHIPPING_CENTS } from "@/lib/pricing";

/**
 * Shared shipping logic for the quote endpoint (cart estimator) and checkout
 * (the charge). Keeping the weight math and FedEx-vs-flat decision in one place
 * means the rate a customer is shown is the same one we re-derive and bill.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Item shape both the cart and checkout already carry. */
export type ShippableItem = { variantId: string; quantity: number };

// Each shipment carries some box/filler weight on top of the cookies.
const PACKAGING_OZ = 4;
// Used when a variant has no weight recorded yet, so quotes never come back empty.
const DEFAULT_VARIANT_OZ = 16;

/** The flat-rate option used whenever FedEx isn't configured or errors out. */
export const FLAT_OPTION: ShippingOption = {
  serviceType: "FLAT",
  label: "Standard shipping",
  amountCents: FLAT_SHIPPING_CENTS,
  transitDays: null,
};

/** Server-trusted package weight (lb) for a cart, from variant weights + box. */
export async function packageWeightLb(db: Db, items: ShippableItem[]): Promise<number> {
  const { data: variants, error } = await db
    .from("product_variants")
    .select("id, weight_oz")
    .in(
      "id",
      items.map((i) => i.variantId),
    );
  if (error || !variants) throw new Error("Could not load cart for shipping");

  let totalOz = PACKAGING_OZ;
  for (const item of items) {
    const oz = variants.find((v) => v.id === item.variantId)?.weight_oz ?? DEFAULT_VARIANT_OZ;
    totalOz += oz * item.quantity;
  }
  return totalOz / 16;
}

export type QuoteResult = { source: "fedex" | "flat"; options: ShippingOption[] };

/**
 * Live FedEx options for a destination ZIP, cheapest-first — or the flat option
 * when FedEx isn't configured, returns nothing, or errors. Never throws on a
 * carrier hiccup, so checkout can't be blocked by FedEx being down.
 */
export async function quoteShipping(opts: {
  db: Db;
  destZip: string;
  items: ShippableItem[];
}): Promise<QuoteResult> {
  if (!isFedExConfigured()) return { source: "flat", options: [FLAT_OPTION] };
  try {
    const weightLb = await packageWeightLb(opts.db, opts.items);
    const options = await getFedExRates({ destZip: opts.destZip, weightLb });
    if (options.length === 0) return { source: "flat", options: [FLAT_OPTION] };
    return { source: "fedex", options };
  } catch (e) {
    console.error("FedEx rate lookup failed; using flat rate:", e);
    return { source: "flat", options: [FLAT_OPTION] };
  }
}

/** The two flat tiers used when FedEx can't quote a destination. */
const FLAT_REGULAR_TIER: TieredShippingOption = {
  serviceType: "FLAT",
  label: "Regular",
  tier: "Regular",
  amountCents: FLAT_SHIPPING_CENTS,
  transitDays: null,
};
const FLAT_EXPRESS_TIER: TieredShippingOption = {
  serviceType: "FLAT_EXPRESS",
  label: "Express",
  tier: "Express",
  amountCents: FLAT_EXPRESS_SHIPPING_CENTS,
  transitDays: null,
};

/**
 * The Regular + Express tiers for a destination, used by the embedded checkout.
 * Live FedEx rates are collapsed into the two tiers; when FedEx isn't available
 * or only returns one bucket, the missing tier is filled from a flat rate so the
 * customer always sees both choices.
 */
export async function shippingTiersForZip(opts: {
  db: Db;
  destZip: string;
  items: ShippableItem[];
}): Promise<TieredShippingOption[]> {
  const { source, options } = await quoteShipping(opts);
  if (source === "flat") return [FLAT_REGULAR_TIER, FLAT_EXPRESS_TIER];

  const { regular, express } = splitTiers(options);
  const tiers: TieredShippingOption[] = [];
  tiers.push(regular ?? FLAT_REGULAR_TIER);
  // Only synthesize a flat Express if it's pricier than Regular, so the upgrade
  // never costs less than the base tier.
  const expressTier =
    express ??
    (FLAT_EXPRESS_TIER.amountCents > (regular?.amountCents ?? 0) ? FLAT_EXPRESS_TIER : null);
  if (expressTier) tiers.push(expressTier);
  return tiers;
}

/**
 * Re-derive the shipping option a customer selected, server-side, so the amount
 * we bill can't be tampered with from the client. Falls back to the cheapest
 * available option (or flat) when the requested service isn't offered for this
 * destination. A blank ZIP/service yields the flat option.
 */
export async function resolveSelectedShipping(opts: {
  db: Db;
  destZip?: string;
  items: ShippableItem[];
  serviceType?: string;
}): Promise<ShippingOption> {
  if (!opts.destZip) return FLAT_OPTION;
  const { options } = await quoteShipping({ db: opts.db, destZip: opts.destZip, items: opts.items });
  if (opts.serviceType) {
    const match = options.find((o) => o.serviceType === opts.serviceType);
    if (match) return match;
  }
  return options[0] ?? FLAT_OPTION;
}
