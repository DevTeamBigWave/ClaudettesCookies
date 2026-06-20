import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, DataTable } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function AnalyticsPage() {
  const db = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: views, error: viewsErr }, { data: attributed, error: attribErr }, { count: paidCount }] =
    await Promise.all([
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
      db.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid").gte("created_at", since30),
    ]);

  const analyticsReady = !viewsErr;
  const visits = views?.length ?? 0;
  const uniqueVisitors = new Set((views ?? []).map((v) => v.visitor_id).filter(Boolean)).size;
  const orderCount = paidCount ?? 0;
  const topPages = topBy(views ?? [], (v) => v.path, 8);
  const topSources = topBy(views ?? [], sourceLabel, 8);

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
      <PageHeader
        title="Analytics"
        description="Website traffic and where your sales come from — last 30 days."
      />

      {!analyticsReady ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Traffic analytics will appear here once database migration{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">0014_site_analytics</code> is
          applied in Supabase. (Sales-by-source needs the same migration.)
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visits" value={visits.toLocaleString()} hint="pageviews · 30d" />
            <StatCard label="Unique visitors" value={uniqueVisitors.toLocaleString()} hint="30d" />
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

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
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

          <div className="mt-8">
            <h2 className="mb-1 font-display text-lg font-semibold">Sales by source</h2>
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
                    No attributed paid orders in the last 30 days yet.
                  </td>
                </tr>
              )}
            </DataTable>
          </div>
        </>
      )}
    </>
  );
}
