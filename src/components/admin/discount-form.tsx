"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDiscount, updateDiscount } from "@/app/admin/(panel)/actions";
import type { Discount } from "@/types/db";

/** ISO timestamp → value for an <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DiscountForm({
  editing,
  onDone,
}: {
  editing?: Discount | null;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(editing?.type ?? "percentage");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    // key remounts the form (resetting defaults + type state) when switching rows.
    <form
      key={editing?.id ?? "new"}
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = editing ? await updateDiscount(editing.id, fd) : await createDiscount(fd);
          if (res?.error) setError(res.error);
          else {
            formRef.current?.reset();
            onDone?.();
          }
        })
      }
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">
        {editing ? `Edit ${editing.code}` : "New promotion"}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            placeholder="SUMMER20"
            required
            defaultValue={editing?.code ?? ""}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as Discount["type"])}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed_amount">Fixed amount off (cents)</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </div>
        {type !== "free_shipping" && (
          <div>
            <Label htmlFor="value">{type === "percentage" ? "Percent (0–100)" : "Amount off (cents)"}</Label>
            <Input id="value" name="value" type="number" defaultValue={editing?.value ?? 10} className="mt-1.5" />
          </div>
        )}
        <div>
          <Label htmlFor="min_subtotal_cents">Min. subtotal (cents)</Label>
          <Input
            id="min_subtotal_cents"
            name="min_subtotal_cents"
            type="number"
            defaultValue={editing?.min_subtotal_cents ?? 0}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="usage_limit">Usage limit (blank = ∞)</Label>
          <Input
            id="usage_limit"
            name="usage_limit"
            type="number"
            defaultValue={editing && editing.usage_limit && editing.usage_limit !== 1 ? editing.usage_limit : ""}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="ends_at">Expires (optional)</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalInput(editing?.ends_at)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="one_time" defaultChecked={editing?.usage_limit === 1} className="h-4 w-4" />
          One-time use (whole store — caps usage limit at 1)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="once_per_customer"
            defaultChecked={editing?.once_per_customer ?? false}
            className="h-4 w-4"
          />
          Limit to once per customer
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create promotion"}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={() => onDone?.()} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
