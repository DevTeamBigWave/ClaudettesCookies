"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDiscount } from "@/app/admin/(panel)/actions";

export function DiscountForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("percentage");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await createDiscount(fd);
          if (res?.error) setError(res.error);
          else formRef.current?.reset();
        })
      }
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">New promotion</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" placeholder="SUMMER20" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed_amount">Fixed amount off (cents)</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </div>
        {type !== "free_shipping" && (
          <div>
            <Label htmlFor="value">
              {type === "percentage" ? "Percent (0–100)" : "Amount off (cents)"}
            </Label>
            <Input id="value" name="value" type="number" defaultValue={10} className="mt-1.5" />
          </div>
        )}
        <div>
          <Label htmlFor="min_subtotal_cents">Min. subtotal (cents)</Label>
          <Input id="min_subtotal_cents" name="min_subtotal_cents" type="number" defaultValue={0} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="usage_limit">Usage limit (blank = ∞)</Label>
          <Input id="usage_limit" name="usage_limit" type="number" className="mt-1.5" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? "Creating…" : "Create promotion"}
      </Button>
    </form>
  );
}
