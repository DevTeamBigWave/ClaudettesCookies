import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill } from "@/components/admin/ui";
import { DiscountForm } from "@/components/admin/discount-form";
import { DiscountToggle } from "@/components/admin/discount-toggle";
import { formatMoney } from "@/lib/utils";
import type { Discount } from "@/types/db";

function describe(d: Discount) {
  if (d.type === "percentage") return `${d.value}% off`;
  if (d.type === "fixed_amount") return `${formatMoney(d.value)} off`;
  return "Free shipping";
}

export default async function PromotionsPage() {
  const db = createAdminClient();
  const { data: discounts } = await db
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Promotions" description="Discount codes customers can apply at checkout." />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
        <DataTable columns={["Code", "Reward", "Min spend", "Used", "Status", ""]}>
          {((discounts as Discount[]) ?? []).map((d) => (
            <tr key={d.id} className="hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono font-medium">{d.code}</td>
              <td className="px-4 py-3">{describe(d)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {d.min_subtotal_cents ? formatMoney(d.min_subtotal_cents) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {d.used_count}{d.usage_limit ? ` / ${d.usage_limit}` : ""}
              </td>
              <td className="px-4 py-3"><StatusPill status={d.active ? "active" : "disabled"} /></td>
              <td className="px-4 py-3 text-right"><DiscountToggle id={d.id} active={d.active} /></td>
            </tr>
          ))}
          {(!discounts || discounts.length === 0) && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No promotions yet.</td></tr>
          )}
        </DataTable>
        <DiscountForm />
      </div>
    </>
  );
}
