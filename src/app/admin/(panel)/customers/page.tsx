import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function CustomersPage() {
  const db = createAdminClient();
  const { data: customers } = await db
    .from("customers")
    .select("id, email, full_name, orders_count, total_spent_cents, created_at")
    .order("total_spent_cents", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader title="Customers" description="Ranked by lifetime spend." />
      <DataTable columns={["Customer", "Orders", "Lifetime spend", "Joined"]}>
        {(customers ?? []).map((c) => (
          <tr key={c.id} className="hover:bg-secondary/40">
            <td className="px-4 py-3">
              <div className="font-medium">{c.full_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{c.email}</div>
            </td>
            <td className="px-4 py-3">{c.orders_count}</td>
            <td className="px-4 py-3 font-medium">{formatMoney(c.total_spent_cents)}</td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
          </tr>
        ))}
        {(!customers || customers.length === 0) && (
          <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No customers yet.</td></tr>
        )}
      </DataTable>
    </>
  );
}
