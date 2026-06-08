"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startBlogDrop, getLatestBlogJob } from "@/app/admin/(panel)/actions";
import type { BlogGenerationJob } from "@/types/db";

/**
 * Fires the Claude generator on demand and publishes the result — same code
 * path as the weekly cron. The drop runs in the background (Railway keeps the
 * server alive), so this button just kicks it off and polls the job row for
 * status; the admin is free to leave the page while it generates. On a fresh
 * load we resume from `initialJob`, so a drop started earlier still shows here.
 * Disabled when generation isn't configured (no ANTHROPIC_API_KEY).
 */
export function GeneratePostButton({
  enabled,
  initialJob,
}: {
  enabled: boolean;
  initialJob: BlogGenerationJob | null;
}) {
  const router = useRouter();
  const [job, setJob] = useState<BlogGenerationJob | null>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const running = job?.status === "running";

  // Poll while a drop is running — this keeps working if you navigate away and
  // come back, since the server keeps generating regardless of this tab.
  useEffect(() => {
    if (!running) return;
    let active = true;
    const timer = setInterval(async () => {
      const latest = await getLatestBlogJob();
      if (!active) return;
      setJob(latest);
      if (latest && latest.status !== "running") {
        clearInterval(timer);
        router.refresh(); // pull the freshly published posts into the table
      }
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [running, router]);

  const onClick = useCallback(
    () =>
      start(async () => {
        setError(null);
        const res = await startBlogDrop();
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setJob(await getLatestBlogJob());
      }),
    [],
  );

  const doneMsg =
    !running && job?.status === "done"
      ? `Published ${job.published_count} new post${job.published_count === 1 ? "" : "s"}.`
      : null;
  const errMsg = error ?? (!running && job?.status === "error" ? job.error : null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={running || !enabled}
        title={enabled ? undefined : "Set ANTHROPIC_API_KEY to enable auto-generation."}
        onClick={onClick}
      >
        {running ? "Generating…" : "Generate drop (3 posts)"}
      </Button>
      {running && (
        <p className="text-xs text-muted-foreground">
          Running in the background — you can leave this page.
        </p>
      )}
      {doneMsg && <p className="text-xs text-muted-foreground">{doneMsg}</p>}
      {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}
    </div>
  );
}
