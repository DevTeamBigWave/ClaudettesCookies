import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Delete abandoned checkouts: orders still in `pending` (payment never
 * completed) older than `hours`. Stripe sessions expire after ~24h, so a
 * pending order past that will never be paid. order_items cascade-delete with
 * the order. Returns how many were removed.
 */
export async function deleteAbandonedOrders(hours = 24): Promise<number> {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("orders")
    .delete()
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    console.error("Abandoned-order cleanup failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
