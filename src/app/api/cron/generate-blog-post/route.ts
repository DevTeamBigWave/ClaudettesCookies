import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { generateAndPublishPost } from "@/lib/blog-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Claude generation can take a while; give it room beyond the default.
export const maxDuration = 300;

/**
 * Generates and publishes one on-brand blog post via Claude.
 * Scheduled for Saturday mornings (e.g. `0 13 * * 6` UTC = ~9am ET) by an
 * external scheduler that sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndPublishPost();
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Blog post generation failed:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
