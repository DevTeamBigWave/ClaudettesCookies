import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable } from "@/components/admin/ui";
import { OrderRow } from "@/components/admin/order-row";
import { CleanupOrdersButton } from "@/components/admin/cleanup-orders-button";

export default async function OrdersPage() {
  const db = createAdminClient();
  // Only real orders — hide 'pending' rows, which are abandoned checkouts (a
  // pending order is created when someone starts checkout but never pays).
  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("Orders list query failed:", error.message);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Paid orders, newest first. Click a row to open it."
        action={<CleanupOrdersButton />}
      />
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
