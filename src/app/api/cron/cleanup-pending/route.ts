import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { deleteAbandonedOrders } from "@/lib/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Purge abandoned checkouts (pending orders > 24h old). Run daily via Railway
 * Cron with `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deleteAbandonedOrders(24);
  return NextResponse.json({ ok: true, deleted });
}
