"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/admin/ui";
import { saveMarketingSettings } from "@/app/admin/(panel)/actions";
import type { Discount, MarketingSettings } from "@/types/db";

type PromoOption = Pick<Discount, "id" | "code" | "type" | "value">;

function reward(d: PromoOption): string {
  if (d.type === "percentage") return `${d.value}% off`;
  if (d.type === "fixed_amount") return `$${(d.value / 100).toFixed(2)} off`;
  return "free shipping";
}

export function SaturdayEmailCard({
  discounts,
  settings,
}: {
  discounts: PromoOption[];
  settings: MarketingSettings | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setMsg(null);
          setError(null);
          const res = await saveMarketingSettings(fd);
          if (res?.error) setError(res.error);
          else setMsg("Saved. Saturday's email draft will use this.");
        })
      }
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">Saturday email offer</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each Saturday, Claude drafts an email featuring the new Journal posts. Add an offer to fold
        in — it’s saved as a <strong>draft</strong> for you to review and send.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="featured_discount_id">Feature a promotion</Label>
          <select
            id="featured_discount_id"
            name="featured_discount_id"
            defaultValue={settings?.featured_discount_id ?? ""}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="">— None —</option>
            {discounts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} ({reward(d)})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Only active promotions appear here. Manage them on the Promotions page.
          </p>
        </div>

        <div>
          <Label htmlFor="offer_note">Offer note (optional)</Label>
          <Textarea
            id="offer_note"
            name="offer_note"
            rows={3}
            defaultValue={settings?.offer_note ?? ""}
            placeholder="e.g. Free tote with any 3 boxes this weekend only."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>How to use it</Label>
          <div className="mt-1.5 space-y-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="offer_mode" value="add" defaultChecked={settings?.offer_mode !== "overwrite"} />
              Add to the post roundup
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="offer_mode" value="overwrite" defaultChecked={settings?.offer_mode === "overwrite"} />
              Make the offer the lead
            </label>
          </div>
        </div>
      </div>

      {error && <FormError className="mt-3">{error}</FormError>}
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? "Saving…" : "Save offer"}
      </Button>
    </form>
  );
}
