"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanupAbandonedOrders } from "@/app/admin/(panel)/actions";

/** Removes abandoned checkouts (pending orders > 24h) on demand. */
export function CleanupOrdersButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-sm text-muted-foreground">{note}</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { deleted } = await cleanupAbandonedOrders();
            setNote(deleted > 0 ? `Removed ${deleted} abandoned` : "Nothing to clean up");
          })
        }
      >
        <Trash2 className="size-4" /> {pending ? "Cleaning…" : "Clean up abandoned"}
      </Button>
    </div>
  );
}
