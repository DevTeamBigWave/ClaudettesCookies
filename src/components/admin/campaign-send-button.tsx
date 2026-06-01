"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendCampaignNow } from "@/app/admin/(panel)/actions";

export function CampaignSendButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Send now?</span>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(async () => {
            await sendCampaignNow(id);
            setConfirming(false);
          })}
        >
          {pending ? "Sending…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      Send now
    </Button>
  );
}
