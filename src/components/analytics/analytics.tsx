"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
  analyticsEnabled,
  gtagSrcId,
  hasGoogle,
  hasMeta,
  trackPageView,
} from "@/lib/analytics";

/**
 * Loads the third-party tags (gtag.js for GA4 / Google Ads, Meta Pixel) and
 * fires a page_view on every client-side navigation. Renders nothing when no
 * tracking IDs are configured, so the storefront ships zero analytics weight
 * until the env vars are set.
 *
 * Tags use `strategy="afterInteractive"` so they never block first paint or LCP.
 */
export function Analytics() {
  if (!analyticsEnabled) return null;

  return (
    <>
      {hasGoogle && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagSrcId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${GA_MEASUREMENT_ID ? `gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });` : ""}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {hasMeta && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}

/**
 * GA4's `config` auto-sends the first page_view; this fires subsequent ones on
 * SPA navigation. We skip the very first render so the landing page isn't
 * double-counted.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const qs = searchParams?.toString();
    trackPageView(pathname + (qs ? `?${qs}` : ""));
  }, [pathname, searchParams]);

  return null;
}
