"use client";

import { useState, useTransition } from "react";
import { DataTable, StatusPill } from "@/components/admin/ui";
import { DiscountForm } from "@/components/admin/discount-form";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { deleteDiscount, toggleDiscount } from "@/app/admin/(panel)/actions";
import type { Discount } from "@/types/db";

function describe(d: Discount) {
  if (d.type === "percentage") return `${d.value}% off`;
  if (d.type === "fixed_amount") return `${formatMoney(d.value)} off`;
  return "Free shipping";
}

/** Human-readable limit summary for a promotion row. */
function limits(d: Discount): string {
  const parts: string[] = [];
  if (d.min_subtotal_cents) parts.push(`min ${formatMoney(d.min_subtotal_cents)}`);
  if (d.usage_limit === 1) parts.push("one-time");
  if (d.once_per_customer) parts.push("1 / customer");
  parts.push(d.ends_at ? `expires ${formatDate(d.ends_at)}` : "no expiry");
  return parts.join(" · ");
}

export function PromotionsManager({ discounts }: { discounts: Discount[] }) {
  const [editing, setEditing] = useState<Discount | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
      <DataTable columns={["Code", "Reward", "Limits", "Used", "Status", ""]}>
        {discounts.map((d) => {
          const expired = d.ends_at != null && new Date(d.ends_at) < new Date();
          return (
            <tr key={d.id} className="align-top hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono font-medium">{d.code}</td>
              <td className="px-4 py-3">{describe(d)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{limits(d)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {d.used_count}
                {d.usage_limit ? ` / ${d.usage_limit}` : ""}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={expired ? "disabled" : d.active ? "active" : "disabled"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => start(() => toggleDiscount(d.id, !d.active))}
                  >
                    {d.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Delete ${d.code}? This can't be undone.`)) {
                        if (editing?.id === d.id) setEditing(null);
                        start(() => deleteDiscount(d.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
        {discounts.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
              No promotions yet.
            </td>
          </tr>
        )}
      </DataTable>
      <DiscountForm editing={editing} onDone={() => setEditing(null)} />
    </div>
  );
}
