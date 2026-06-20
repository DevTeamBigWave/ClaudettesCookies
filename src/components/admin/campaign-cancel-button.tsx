"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelCampaign } from "@/app/admin/(panel)/actions";

/** Stops a scheduled (or draft) campaign before it sends. */
export function CampaignCancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(async () => { await cancelCampaign(id); })}
    >
      {pending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}
