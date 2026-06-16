import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { liveRates } from "@/lib/live-shipping";

export const runtime = "nodejs";

/**
 * Live shipping rates for a destination address. The checkout calls this once
 * the customer has typed a complete address, shows the returned options, and
 * sends the chosen one's `id` back to /api/checkout (which re-quotes to confirm
 * the price). Falls back to flat tiers when Shippo isn't configured.
 */
const Body = z.object({
  address: z.object({
    name: z.string().trim().optional(),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().length(2),
    postalCode: z.string().trim().min(3).max(10),
    phone: z.string().trim().optional(),
  }),
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a complete shipping address." }, { status: 400 });
  }
  const { address, items } = parsed.data;
  const db = createAdminClient();
  try {
    const rates = await liveRates(db, address, items);
    return NextResponse.json({ rates });
  } catch (e) {
    console.error("Rate lookup failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not fetch shipping rates" },
      { status: 502 },
    );
  }
}
