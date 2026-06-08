/**
 * Build a public "track your package" URL for a carrier + tracking number.
 * Returns null for carriers we don't have a deep link for (e.g. "Other"), so
 * callers can hide the link rather than produce a broken one.
 */
export function trackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string,
): string | null {
  const c = (carrier ?? "").toLowerCase();
  const n = encodeURIComponent(trackingNumber.trim());
  if (!n) return null;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
  return null;
}

/** Carriers offered in the admin "Mark as shipped" form. */
export const CARRIERS = ["FedEx", "USPS", "UPS", "DHL", "Other"] as const;
