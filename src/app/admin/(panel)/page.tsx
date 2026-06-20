import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, DataTable, StatusPill } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  const db = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: paidOrders }, { count: customerCount }, { count: subCount }, { data: recent }] =
    await Promise.all([
      db.from("orders").select("total_cents, created_at").eq("status", "paid").gte("created_at", since30),
      db.from("customers").select("*", { count: "exact", head: true }),
      db.from("email_subscribers").select("*", { count: "exact", head: true }).eq("status", "subscribed"),
      db
        .from("orders")
        .select("id, order_number, email, status, total_cents, created_at")
        .neq("status", "pending") // hide abandoned checkouts; show only real orders
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const revenue = (paidOrders ?? []).reduce((s, o) => s + o.total_cents, 0);
  const orderCount = paidOrders?.length ?? 0;
  const aov = orderCount ? Math.round(revenue / orderCount) : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Last 30 days at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (30d)" value={formatMoney(revenue)} hint={`${orderCount} paid orders`} />
        <StatCard label="Avg. order value" value={formatMoney(aov)} />
        <StatCard label="Customers" value={String(customerCount ?? 0)} hint="all time" />
        <StatCard label="Subscribers" value={String(subCount ?? 0)} hint="email list" />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Looking for traffic &amp; sales-by-source?{" "}
        <Link href="/admin/analytics" className="font-medium text-primary hover:underline">
          See Analytics →
        </Link>
      </p>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <DataTable columns={["Order", "Customer", "Status", "Total", "Date"]}>
          {(recent ?? []).map((o) => (
            <tr key={o.id} className="hover:bg-secondary/40">
              <td className="px-4 py-3 font-medium">#{o.order_number}</td>
              <td className="px-4 py-3 text-muted-foreground">{o.email}</td>
              <td className="px-4 py-3"><StatusPill status={o.status} /></td>
              <td className="px-4 py-3 font-medium">{formatMoney(o.total_cents)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(o.created_at)}</td>
            </tr>
          ))}
          {(!recent || recent.length === 0) && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No orders yet — they&rsquo;ll appear here the moment they come in.
              </td>
            </tr>
          )}
        </DataTable>
      </div>
    </>
  );
}
