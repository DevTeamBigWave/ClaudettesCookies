import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { generateMarketingDraft } from "@/lib/email-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Generates one on-brand marketing email and saves it as a DRAFT campaign for
 * human review (never auto-sent). Scheduled weekly by an external scheduler that
 * sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateMarketingDraft();
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Email draft generation failed:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
