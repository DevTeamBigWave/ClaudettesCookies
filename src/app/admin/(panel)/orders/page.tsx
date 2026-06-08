import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable } from "@/components/admin/ui";
import { OrderRow } from "@/components/admin/order-row";

export default async function OrdersPage() {
  const db = createAdminClient();
  const { data: orders } = await db
    .from("orders")
    .select("id, order_number, email, status, fulfillment, shipping_method, tracking_number, delivery_status, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

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
