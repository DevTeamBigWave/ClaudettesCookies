"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution, getVisitorId } from "@/lib/attribution";

/**
 * First-party pageview logging — always on, independent of GA/Meta. Sends a
 * tiny beacon to /api/track on every navigation so the admin dashboard can show
 * traffic and sales-by-source without anyone logging into Google. Never blocks
 * render and silently no-ops if anything is unavailable.
 */
export function SiteAnalytics() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Re-fire when the querystring changes too (campaign params land there).
  const qs = searchParams?.toString() ?? "";
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = pathname + (qs ? `?${qs}` : "");
    if (lastSent.current === key) return; // guard StrictMode double-invoke
    lastSent.current = key;

    const attribution = captureAttribution();
    const payload = JSON.stringify({
      path: pathname,
      ref: attribution.referrerHost ?? null,
      source: attribution.utmSource ?? null,
      medium: attribution.utmMedium ?? null,
      campaign: attribution.utmCampaign ?? null,
      vid: getVisitorId(),
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* best-effort */
    }
  }, [pathname, qs]);

  return null;
}
