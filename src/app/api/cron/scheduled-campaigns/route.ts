import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaign } from "@/lib/campaigns";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispatches any campaigns whose scheduled_at has passed. Run every 5 min via
 * Railway Cron. sendCampaign() claims each campaign atomically, so overlapping
 * runs can't double-send.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();

  const { data: due } = await db
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(10);

  const results = [];
  for (const c of due ?? []) {
    const r = await sendCampaign(c.id);
    results.push({ id: c.id, ...r });
  }

  return NextResponse.json({ ok: true, dispatched: results.length, results });
}
