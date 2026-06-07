import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { generateAndPublishPosts } from "@/lib/blog-generator";
import { generateSaturdayEmailDraft } from "@/lib/email-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A drop is several Claude generations plus an email compose; give it room.
export const maxDuration = 800;

/**
 * The Saturday drop: generates + publishes a batch of on-brand Journal posts,
 * then composes a marketing email featuring them (+ any configured offer) and
 * saves it as a DRAFT for review — never auto-sent. Scheduled for Saturday
 * mornings (e.g. `0 13 * * 6` UTC = ~9am ET) by an external scheduler sending
 * `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndPublishPosts();
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    // Posts are already live; an email failure shouldn't fail the drop.
    const email = await generateSaturdayEmailDraft(result.published).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "Email draft failed",
    }));
    return NextResponse.json({ ...result, email });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Saturday drop failed:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
