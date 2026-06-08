import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable } from "@/components/admin/ui";
import { OrderRow } from "@/components/admin/order-row";

export default async function OrdersPage() {
  const db = createAdminClient();
  // select("*") instead of naming columns: keeps the whole list from blanking
  // out if a newly-added column (e.g. delivery_status) hasn't been migrated in
  // Supabase yet — missing columns just render as empty rather than erroring.
  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("Orders list query failed:", error.message);

  return (
    <>
      <PageHeader title="Orders" description="Every order, newest first. Click a row to open it." />
      <DataTable columns={["Order", "Customer", "Payment", "Fulfillment", "Shipping", "Total", "Date"]}>
        {(orders ?? []).map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
        {(!orders || orders.length === 0) && (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
        )}
      </DataTable>
    </>
  );
}
