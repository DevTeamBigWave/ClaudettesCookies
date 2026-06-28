"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { FUNNELS } from "@/config/funnels";

/**
 * Shows a small "your quiz match" badge when a visitor arrives from a funnel
 * (e.g. /products/x?ref=find-your-box). Purely additive and non-destructive —
 * renders nothing unless the `ref` param matches a known funnel.
 */
function Inner() {
  const ref = useSearchParams().get("ref");
  if (!ref || !FUNNELS[ref]) return null;
  return (
    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
      <Sparkles className="size-4" /> Your quiz match
    </div>
  );
}

export function QuizMatchBanner() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
