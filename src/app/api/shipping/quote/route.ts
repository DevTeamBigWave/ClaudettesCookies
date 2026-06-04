import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFedExRates, isFedExConfigured, type ShippingOption } from "@/lib/fedex";
import { FLAT_SHIPPING_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Each shipment carries some box/filler weight on top of the cookies.
const PACKAGING_OZ = 4;
// Used when a variant has no weight recorded yet, so quotes never come back empty.
const DEFAULT_VARIANT_OZ = 16;

const Body = z.object({
  // 5-digit US ZIP (optionally ZIP+4).
  destZip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid US ZIP code"),
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
});

/** Flat-rate option used whenever FedEx isn't configured or errors out. */
function flatFallback(): { options: ShippingOption[]; source: "flat" } {
  return {
    source: "flat",
    options: [
      { serviceType: "FLAT", label: "Standard shipping", amountCents: FLAT_SHIPPING_CENTS, transitDays: null },
    ],
  };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { destZip, items } = parsed.data;

  // Sum package weight from the cart's variants (server-trusted weights).
  const db = createAdminClient();
  const { data: variants, error } = await db
    .from("product_variants")
    .select("id, weight_oz")
    .in("id", items.map((i) => i.variantId));
  if (error || !variants) {
    return NextResponse.json({ error: "Could not load cart" }, { status: 500 });
  }

  let totalOz = PACKAGING_OZ;
  for (const item of items) {
    const v = variants.find((x) => x.id === item.variantId);
    const oz = v?.weight_oz ?? DEFAULT_VARIANT_OZ;
    totalOz += oz * item.quantity;
  }
  const weightLb = totalOz / 16;

  // No FedEx credentials → flat rate, no error.
  if (!isFedExConfigured()) {
    return NextResponse.json(flatFallback());
  }

  try {
    const options = await getFedExRates({ destZip, weightLb });
    if (options.length === 0) return NextResponse.json(flatFallback());
    return NextResponse.json({ source: "fedex", options });
  } catch (e) {
    // Never block checkout on a carrier hiccup — degrade to flat rate.
    console.error("FedEx rate lookup failed; using flat rate:", e);
    return NextResponse.json(flatFallback());
  }
}
