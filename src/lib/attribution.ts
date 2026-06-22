"use client";

/**
 * First-party visitor + campaign attribution, stored in the browser.
 *
 * - A random `visitor_id` (not personal) lets the admin count unique visitors.
 * - When someone lands with UTM tags (e.g. from a Meta or Google ad), we capture
 *   them so the order they eventually place can be attributed to that source.
 *
 * Attribution is last-touch: a fresh ad click overwrites the stored campaign,
 * but plain internal navigation (no UTMs) never clears it — so the source that
 * actually drove the visit survives all the way to checkout.
 */

const VISITOR_KEY = "cc_visitor_id";
const ATTRIB_KEY = "cc_attribution";

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerHost?: string;
  /** Google Ads click id — persisted so it survives the off-site Stripe redirect. */
  gclid?: string;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — analytics is best-effort */
  }
}

export function getVisitorId(): string {
  let id = safeGet(VISITOR_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    safeSet(VISITOR_KEY, id);
  }
  return id;
}

/** The external referrer hostname, or null for direct / same-site navigation. */
export function externalReferrerHost(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : null;
  } catch {
    return null;
  }
}

/**
 * Read UTM tags off the current URL and persist them when present. Returns the
 * attribution that applies to this visit (newly captured or previously stored).
 */
export function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") ?? undefined;
  const gclid = params.get("gclid") ?? undefined;
  const referrerHost = externalReferrerHost() ?? undefined;

  // A UTM-tagged hit OR a Google Ads click (gclid) is a new touch worth storing.
  if (utmSource || gclid) {
    const stored = getAttribution();
    const attribution: Attribution = {
      utmSource,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      referrerHost,
      // Keep a previously stored gclid if this hit doesn't carry one.
      gclid: gclid ?? stored.gclid,
    };
    safeSet(ATTRIB_KEY, JSON.stringify(attribution));
    return attribution;
  }

  // No UTMs or gclid on this hit: keep any stored campaign, but still surface the
  // referrer host for this pageview (without overwriting stored attribution).
  const stored = getAttribution();
  return Object.keys(stored).length ? stored : referrerHost ? { referrerHost } : {};
}

/** The attribution to stamp onto an order at checkout. */
export function getAttribution(): Attribution {
  const raw = safeGet(ATTRIB_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}
