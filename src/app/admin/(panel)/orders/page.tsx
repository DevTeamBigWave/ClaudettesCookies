import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function OrdersPage() {
  const db = createAdminClient();
  const { data: orders } = await db
    .from("orders")
    .select("id, order_number, email, status, fulfillment, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader title="Orders" description="Every order, newest first." />
      <DataTable columns={["Order", "Customer", "Payment", "Fulfillment", "Total", "Date"]}>
        {(orders ?? []).map((o) => (
          <tr key={o.id} className="hover:bg-secondary/40">
            <td className="px-4 py-3 font-medium">#{o.order_number}</td>
            <td className="px-4 py-3 text-muted-foreground">{o.email}</td>
            <td className="px-4 py-3"><StatusPill status={o.status} /></td>
            <td className="px-4 py-3"><StatusPill status={o.fulfillment} /></td>
            <td className="px-4 py-3 font-medium">{formatMoney(o.total_cents)}</td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(o.created_at)}</td>
          </tr>
        ))}
        {(!orders || orders.length === 0) && (
          <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
        )}
      </DataTable>
    </>
  );
}
