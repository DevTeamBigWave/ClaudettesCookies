import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteShipping } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // 5-digit US ZIP (optionally ZIP+4).
  destZip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid US ZIP code"),
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { destZip, items } = parsed.data;

  try {
    const result = await quoteShipping({ db: createAdminClient(), destZip, items });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not load cart" }, { status: 500 });
  }
}
