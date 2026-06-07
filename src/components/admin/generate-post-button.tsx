"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateBlogPostNow } from "@/app/admin/(panel)/actions";

/**
 * Fires the Claude generator on demand and publishes the result. Same code path
 * as the weekly cron — handy for kicking off the first post or a one-off.
 * Disabled when generation isn't configured (no ANTHROPIC_API_KEY).
 */
export function GeneratePostButton({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending || !enabled}
        title={enabled ? undefined : "Set ANTHROPIC_API_KEY to enable auto-generation."}
        onClick={() =>
          start(async () => {
            setError(null);
            setMsg(null);
            const res = await generateBlogPostNow();
            if (res?.error) setError(res.error);
            else setMsg(`Published “${res.title}”.`);
          })
        }
      >
        {pending ? "Generating…" : "Generate with Claude"}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
