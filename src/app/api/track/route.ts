import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Keep the payload tiny and bounded. No IP or PII is recorded — visitors are
// counted by the random first-party id only.
const Body = z.object({
  path: z.string().min(1).max(512),
  ref: z.string().max(255).nullish(),
  source: z.string().max(120).nullish(),
  medium: z.string().max(120).nullish(),
  campaign: z.string().max(160).nullish(),
  vid: z.string().max(64).nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  // Never let analytics surface an error to the visitor — just no-op.
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const { path, ref, source, medium, campaign, vid } = parsed.data;
  try {
    const db = createAdminClient();
    await db.from("page_views").insert({
      path: path.slice(0, 512),
      referrer_host: ref ?? null,
      utm_source: source ?? null,
      utm_medium: medium ?? null,
      utm_campaign: campaign ?? null,
      visitor_id: vid ?? null,
    });
  } catch (e) {
    // Don't fail the beacon if the table isn't migrated yet or the DB blips.
    console.error("page_view insert failed:", e instanceof Error ? e.message : e);
  }
  return new NextResponse(null, { status: 204 });
}
