import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, DataTable, StatusPill } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

/** Count occurrences of a label and return the top N, biggest first. */
function topBy<T>(rows: T[], label: (row: T) => string, n: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = label(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Human label for where an order/visit came from, as "source / medium". */
function sourceLabel(row: {
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer_host?: string | null;
}): string {
  const src = row.utm_source?.trim();
  if (src) {
    const med = row.utm_medium?.trim();
    return med ? `${src} / ${med}` : src;
  }
  return row.referrer_host?.trim() || "Direct";
}

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

  // Traffic + attribution. Both tolerate a not-yet-applied migration 0014 (the
  // queries error on the missing table/columns) by degrading to a hint.
  const [{ data: views, error: viewsErr }, { data: attributed, error: attribErr }] = await Promise.all([
    db
      .from("page_views")
      .select("path, visitor_id, utm_source, utm_medium, referrer_host")
      .gte("created_at", since30)
      .limit(100000),
    db
      .from("orders")
      .select("total_cents, utm_source, utm_medium, referrer_host")
      .eq("status", "paid")
      .gte("created_at", since30),
  ]);

  const analyticsReady = !viewsErr;
  const visits = views?.length ?? 0;
  const uniqueVisitors = new Set((views ?? []).map((v) => v.visitor_id).filter(Boolean)).size;
  const topPages = topBy(views ?? [], (v) => v.path, 6);
  const topSources = topBy(views ?? [], sourceLabel, 6);

  // Revenue grouped by source for paid orders in the window.
  const revenueBySource = (() => {
    if (attribErr) return [];
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const o of attributed ?? []) {
      const key = sourceLabel(o);
      const cur = map.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += o.total_cents;
      cur.orders += 1;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  })();

  return (
    <>
      <PageHeader title="Dashboard" description="Last 30 days at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (30d)" value={formatMoney(revenue)} hint={`${orderCount} paid orders`} />
        <StatCard label="Avg. order value" value={formatMoney(aov)} />
        <StatCard label="Customers" value={String(customerCount ?? 0)} hint="all time" />
        <StatCard label="Subscribers" value={String(subCount ?? 0)} hint="email list" />
      </div>

      {/* Traffic */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Traffic (30 days)</h2>
        {analyticsReady ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Visits" value={visits.toLocaleString()} hint="pageviews" />
              <StatCard label="Unique visitors" value={uniqueVisitors.toLocaleString()} />
              <StatCard
                label="Visit → order"
                value={visits ? `${((orderCount / visits) * 100).toFixed(1)}%` : "—"}
                hint="paid orders ÷ visits"
              />
              <StatCard
                label="Top source"
                value={topSources[0]?.label ?? "—"}
                hint={topSources[0] ? `${topSources[0].count} visits` : undefined}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">Top pages</p>
                <DataTable columns={["Page", "Views"]}>
                  {topPages.map((p) => (
                    <tr key={p.label} className="hover:bg-secondary/40">
                      <td className="px-4 py-2.5 font-medium">{p.label}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {topPages.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                        No visits recorded yet.
                      </td>
                    </tr>
                  )}
                </DataTable>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">Top sources</p>
                <DataTable columns={["Source", "Visits"]}>
                  {topSources.map((s) => (
                    <tr key={s.label} className="hover:bg-secondary/40">
                      <td className="px-4 py-2.5 font-medium">{s.label}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {topSources.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                        No visits recorded yet.
                      </td>
                    </tr>
                  )}
                </DataTable>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Traffic analytics will appear here once database migration{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">0014_site_analytics</code> is
            applied in Supabase.
          </div>
        )}
      </div>

      {/* Revenue by source */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Sales by source (30 days)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          First-party, last-touch attribution. Your ad platforms&rsquo; own dashboards remain the
          billing-authoritative numbers and may differ.
        </p>
        <DataTable columns={["Source", "Orders", "Revenue"]}>
          {revenueBySource.map((r) => (
            <tr key={r.label} className="hover:bg-secondary/40">
              <td className="px-4 py-3 font-medium">{r.label}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.orders}</td>
              <td className="px-4 py-3 font-medium">{formatMoney(r.revenue)}</td>
            </tr>
          ))}
          {revenueBySource.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                {attribErr
                  ? "Apply migration 0014 to attribute orders to a source."
                  : "No paid orders in the last 30 days yet."}
              </td>
            </tr>
          )}
        </DataTable>
      </div>

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
