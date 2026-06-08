"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/admin/ui";
import { createCampaign } from "@/app/admin/(panel)/actions";

export function CampaignForm({ subscriberCount }: { subscriberCount: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setError(null);
          setMsg(null);
          const res = await createCampaign(fd);
          if (res?.error) setError(res.error);
          else {
            setMsg(
              fd.get("scheduled_at")
                ? "Campaign scheduled. The cron dispatcher will send it."
                : "Draft saved. Send it from the list when ready.",
            );
            formRef.current?.reset();
          }
        })
      }
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">New campaign</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reaches {subscriberCount} subscribed contact{subscriberCount === 1 ? "" : "s"}.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Internal name</Label>
          <Input id="name" name="name" placeholder="June flavor drop" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="subject">Subject line</Label>
          <Input id="subject" name="subject" placeholder="New: The Sicilian is back 🍪" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="preheader">Preheader</Label>
          <Input id="preheader" name="preheader" placeholder="Limited batch. Don't sleep on it." className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="body_markdown">Body (Markdown)</Label>
          <Textarea
            id="body_markdown"
            name="body_markdown"
            required
            rows={8}
            className="mt-1.5 font-mono text-sm"
            placeholder={"# Hey friend\n\nThe **Sicilian** is back in the rotation...\n\n[Shop now](https://claudettescookies.shop/shop)"}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="segment_status">Audience</Label>
            <select
              id="segment_status"
              name="segment_status"
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            >
              <option value="subscribed">All subscribed</option>
              <option value="pending">Pending only</option>
            </select>
          </div>
          <div>
            <Label htmlFor="scheduled_at">Schedule (optional)</Label>
            <Input id="scheduled_at" name="scheduled_at" type="datetime-local" className="mt-1.5" />
          </div>
        </div>
      </div>
      {error && <FormError className="mt-3">{error}</FormError>}
      {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? "Saving…" : "Save campaign"}
      </Button>
    </form>
  );
}
