import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill, StatCard } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function GiftCardsPage() {
  const db = createAdminClient();
  const { data: cards } = await db
    .from("gift_cards")
    .select("id, code, initial_cents, balance_cents, status, recipient_email, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const outstanding = (cards ?? [])
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.balance_cents, 0);

  return (
    <>
      <PageHeader title="Gift Cards" description="Issued cards and outstanding liability." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding balance" value={formatMoney(outstanding)} hint="active cards" />
        <StatCard label="Cards issued" value={String(cards?.length ?? 0)} />
        <StatCard
          label="Total loaded"
          value={formatMoney((cards ?? []).reduce((s, c) => s + c.initial_cents, 0))}
        />
      </div>
      <DataTable columns={["Code", "Status", "Balance", "Original", "Recipient", "Issued"]}>
        {(cards ?? []).map((c) => (
          <tr key={c.id} className="hover:bg-secondary/40">
            <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
            <td className="px-4 py-3"><StatusPill status={c.status} /></td>
            <td className="px-4 py-3 font-medium">{formatMoney(c.balance_cents)}</td>
            <td className="px-4 py-3 text-muted-foreground">{formatMoney(c.initial_cents)}</td>
            <td className="px-4 py-3 text-muted-foreground">{c.recipient_email ?? "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
          </tr>
        ))}
        {(!cards || cards.length === 0) && (
          <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No gift cards issued yet.</td></tr>
        )}
      </DataTable>
    </>
  );
}
