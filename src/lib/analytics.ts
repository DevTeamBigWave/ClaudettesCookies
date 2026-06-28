"use client";

/**
 * Thin, provider-agnostic analytics layer for the storefront.
 *
 * Wraps Google Analytics 4 / Google Ads (`gtag`) and the Meta Pixel (`fbq`) so
 * the rest of the app fires semantic events (`view_item`, `add_to_cart`,
 * `begin_checkout`, `purchase`) without caring which tags are installed. Every
 * helper is a safe no-op when the corresponding ID env var is unset or the
 * script hasn't loaded yet, so nothing here can throw or block render.
 *
 * IDs are read directly from `process.env.NEXT_PUBLIC_*` so Next inlines them
 * into the client bundle at build time.
 */

// Read as static references so Next can inline them client-side. The live IDs
// are baked in as defaults (they're public, non-secret client ids) so the tags
// work on deploy without extra env config; env vars still override.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XLNBW3HDQZ";
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18263863816";
// Google Ads conversion label for the "purchase" action, formatted as the
// `send_to` value: `AW-XXXXXXXXX/AbC-dEfGhIjK`.
export const GOOGLE_ADS_PURCHASE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "AW-18263863816/b5rMCKrx48McEIjk8YRE";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

export const hasGoogle = Boolean(GA_MEASUREMENT_ID || GOOGLE_ADS_ID);
export const hasMeta = Boolean(META_PIXEL_ID);
export const analyticsEnabled = hasGoogle || hasMeta;

/** The gtag id used to load gtag.js — GA4 first, else Google Ads. */
export const gtagSrcId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;

type GtagArgs = [string, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void };
  }
}

function gtag(...args: GtagArgs) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

/** GA4 ecommerce item shape (also reused to build Meta `contents`). */
export interface AnalyticsItem {
  item_id?: string;
  item_name: string;
  item_variant?: string;
  price?: number; // dollars
  quantity?: number;
}

const toDollars = (cents: number) => Math.round(cents) / 100;

/** Fire a GA4 SPA page_view + Meta PageView on client navigation. */
export function trackPageView(url: string) {
  if (GA_MEASUREMENT_ID) {
    gtag("event", "page_view", { page_path: url, page_location: window.location.href });
  }
  fbq("track", "PageView");
}

export function trackViewItem(item: AnalyticsItem) {
  gtag("event", "view_item", {
    currency: "USD",
    value: item.price ?? 0,
    items: [item],
  });
  fbq("track", "ViewContent", {
    content_type: "product",
    content_ids: item.item_id ? [item.item_id] : undefined,
    content_name: item.item_name,
    currency: "USD",
    value: item.price ?? 0,
  });
}

export function trackAddToCart(items: AnalyticsItem[], valueCents: number) {
  const value = toDollars(valueCents);
  gtag("event", "add_to_cart", { currency: "USD", value, items });
  fbq("track", "AddToCart", {
    content_type: "product",
    content_ids: items.map((i) => i.item_id).filter(Boolean),
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1 })),
    currency: "USD",
    value,
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], valueCents: number) {
  const value = toDollars(valueCents);
  gtag("event", "begin_checkout", { currency: "USD", value, items });
  fbq("track", "InitiateCheckout", {
    content_type: "product",
    content_ids: items.map((i) => i.item_id).filter(Boolean),
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    currency: "USD",
    value,
  });
}

/** Generic GA4 event — used by funnels for started / step_completed / etc. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  gtag("event", name, params ?? {});
}

/** Email capture / soft conversion — lets ads optimize toward lead capture. */
export function trackLead(source: string) {
  gtag("event", "generate_lead", { currency: "USD", value: 0, lead_source: source });
  fbq("track", "Lead", { content_name: source });
}

export interface PurchasePayload {
  transactionId: string;
  valueCents: number;
  shippingCents?: number;
  discountCents?: number;
  items: AnalyticsItem[];
}

/**
 * Fire the conversion event across GA4, Google Ads, and Meta. Call exactly once
 * per order. Fires the Meta Pixel purchase from the cart snapshot (which carries
 * line items). The GA4 `purchase` and Google Ads `conversion` are fired
 * separately from the success page via `trackServerPurchase`, using the
 * server-verified Stripe amount and payment-intent id — so they aren't fired
 * here (doing both would double-count with mismatched transaction ids).
 */
export function trackPurchase(p: PurchasePayload) {
  const value = toDollars(p.valueCents);

  // Meta Pixel purchase. eventID lets a server-side Conversions API event with
  // the same id dedupe against this one if added later.
  fbq(
    "track",
    "Purchase",
    {
      content_type: "product",
      content_ids: p.items.map((i) => i.item_id).filter(Boolean),
      contents: p.items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1 })),
      currency: "USD",
      value,
      num_items: p.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    },
    { eventID: p.transactionId },
  );
}

/**
 * Server-accurate purchase tracking, fired once on the success page from values
 * retrieved server-side off the Stripe Checkout Session. `value` is already in
 * dollars. Sends the Google Ads conversion (for bidding) and the GA4 purchase
 * (for revenue/attribution); `transactionId` (the payment-intent id) dedupes
 * both across refreshes. Optionally sets hashed-on-send user_data email for
 * Google enhanced conversions.
 */
export function trackServerPurchase(p: { transactionId: string; value: number; email?: string }) {
  // Enhanced conversions: gtag hashes the email on send when enabled in the Ads
  // account. Set before the conversion event so it's attached.
  if (p.email) gtag("set", "user_data", { email: p.email });

  if (GOOGLE_ADS_PURCHASE_LABEL) {
    gtag("event", "conversion", {
      send_to: GOOGLE_ADS_PURCHASE_LABEL,
      value: p.value,
      currency: "USD",
      transaction_id: p.transactionId,
    });
  }

  gtag("event", "purchase", {
    transaction_id: p.transactionId,
    value: p.value,
    currency: "USD",
  });
}
