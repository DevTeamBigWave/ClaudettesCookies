import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";
import { trackPackage } from "@/lib/labels";
import { sendEmail } from "@/lib/resend";
import { orderShippedEmail } from "@/lib/emails";
import { trackingUrl } from "@/lib/tracking";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll FedEx for every order that has a tracking number but isn't delivered yet.
 * When FedEx first scans the package (picked up / in transit) and we haven't
 * notified the customer, auto-mark the order shipped and email them the tracking
 * link. Always refreshes the stored delivery status. Run hourly via Railway Cron
 * with `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Dormant until FedEx credentials work — each tracking call just fails closed.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();

  const { data: orders } = await db
    .from("orders")
    .select("id, order_number, email, tracking_number, shipping_carrier, shipped_at, delivery_status")
    .not("tracking_number", "is", null)
    .in("status", ["paid", "fulfilled"])
    .limit(200);

  let checked = 0;
  let notified = 0;

  for (const o of orders ?? []) {
    if (o.delivery_status === "delivered" || !o.tracking_number) continue;
    checked++;

    let result;
    try {
      result = await trackPackage(o.tracking_number, o.shipping_carrier);
    } catch (e) {
      console.error(`Track failed for order #${o.order_number}:`, e);
      continue;
    }

    const updates: Record<string, unknown> = {
      delivery_status: result.status,
      delivered_at: result.deliveredAt,
    };

    // First time FedEx has the package in its network and we haven't sent the
    // shipped email → mark shipped + notify. (label_created doesn't count — it
    // means the label exists but it hasn't been picked up yet.)
    const inNetwork = result.status === "in_transit" || result.status === "delivered";
    if (!o.shipped_at && inNetwork) {
      updates.fulfillment = "fulfilled";
      updates.shipped_at = new Date().toISOString();
      const carrier = o.shipping_carrier && o.shipping_carrier !== "Flat" ? o.shipping_carrier : "FedEx";
      const url = trackingUrl(carrier, o.tracking_number);
      await sendEmail({
        to: o.email,
        subject: `Your Claudette's order #${o.order_number} has shipped 🍪`,
        html: orderShippedEmail({
          orderNumber: o.order_number,
          carrier,
          trackingNumber: o.tracking_number,
          trackingUrl: url,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        }),
      }).catch((e) => console.error("Auto shipped email failed:", e));
      notified++;
    }

    await db.from("orders").update(updates).eq("id", o.id);
  }

  return NextResponse.json({ ok: true, checked, notified });
}
