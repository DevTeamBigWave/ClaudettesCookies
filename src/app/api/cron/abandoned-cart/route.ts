import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { abandonedCartEmail } from "@/lib/emails";
import { isAuthorizedCron } from "@/lib/cron";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a single recovery email for carts abandoned > 1h and < 24h ago that
 * haven't been reminded or recovered. Run hourly via Railway Cron.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const { data: carts } = await db
    .from("abandoned_carts")
    .select("id, email, items")
    .eq("recovered", false)
    .is("reminder_sent_at", null)
    .lt("created_at", oneHourAgo)
    .gt("created_at", oneDayAgo)
    .limit(100);

  let sent = 0;
  for (const cart of carts ?? []) {
    const items = (cart.items as { title?: string }[]) ?? [];
    const titles = items.map((i) => i.title ?? "a box of cookies");
    try {
      await sendEmail({
        to: cart.email,
        subject: "You left cookies in your bag 🍪",
        html: abandonedCartEmail({ siteUrl: env.NEXT_PUBLIC_SITE_URL, itemTitles: titles }),
      });
      await db
        .from("abandoned_carts")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", cart.id);
      sent++;
    } catch (e) {
      console.error("Abandoned cart email failed:", e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
