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
      <h2 className="font-display text-lg font-semibold">Marketing email offer &amp; automation</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Claude drafts on-brand emails featuring new Journal posts. Add an offer to fold in, and
        choose whether drafts wait for your review or send automatically.
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

        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="auto_send"
              defaultChecked={settings?.auto_send ?? false}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-semibold">Auto-send generated emails</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                When on, each AI-drafted email schedules itself to all subscribers after the review
                window below — no manual send needed. You can still cancel it during the window.
              </span>
            </span>
          </label>
          <div className="mt-3 flex items-center gap-2">
            <Label htmlFor="auto_send_delay_minutes" className="text-xs">
              Review window
            </Label>
            <select
              id="auto_send_delay_minutes"
              name="auto_send_delay_minutes"
              defaultValue={String(settings?.auto_send_delay_minutes ?? 120)}
              className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
            >
              <option value="0">Send immediately</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
              <option value="720">12 hours</option>
              <option value="1440">24 hours</option>
            </select>
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
