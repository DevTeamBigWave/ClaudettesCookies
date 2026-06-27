import { isFedExShipConfigured, trackShipment, type TrackResult } from "@/lib/fedex";

/**
 * Delivery tracking. The Shippo label/rate integration was removed — postage is
 * bought manually for now and tracking numbers entered on the order. Automated
 * delivery-status lookups run only if a FedEx Ship account is configured;
 * otherwise they no-op so the tracking cron and admin never error.
 */

export function isLabelProviderConfigured(): boolean {
  return isFedExShipConfigured();
}

export async function trackPackage(
  trackingNumber: string,
  _carrier?: string | null,
): Promise<TrackResult> {
  if (!isFedExShipConfigured()) {
    return { status: "unknown", statusText: "Tracking not available", deliveredAt: null };
  }
  return trackShipment(trackingNumber);
}
