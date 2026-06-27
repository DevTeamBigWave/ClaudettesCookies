import {
  isFedExShipConfigured,
  createFedExLabel,
  trackShipment,
  type LabelRecipient,
  type TrackResult,
} from "@/lib/fedex";
import { isShippoConfigured, createShippoLabel, trackViaShippo } from "@/lib/shippo";

/**
 * Carrier-agnostic label + tracking. Prefers Shippo when SHIPPO_API_TOKEN is set
 * (multi-carrier, no FedEx production-API approval needed); otherwise falls back
 * to the FedEx Ship API directly. The admin label route, delivery tracking, and
 * the tracking cron all go through here, so swapping providers is one place.
 */

export function isLabelProviderConfigured(): boolean {
  return isShippoConfigured() || isFedExShipConfigured();
}

export async function generateLabel(opts: {
  recipient: LabelRecipient;
  weightLb: number;
  serviceType?: string;
}): Promise<{ trackingNumber: string; labelBase64: string; carrier: string; qrCodeUrl: string | null }> {
  if (isShippoConfigured()) return createShippoLabel(opts);
  // FedEx fallback has no QR code (USPS Label Broker is a Shippo/USPS feature).
  const r = await createFedExLabel(opts);
  return { ...r, carrier: "FedEx", qrCodeUrl: null };
}

export async function trackPackage(
  trackingNumber: string,
  carrier?: string | null,
): Promise<TrackResult> {
  if (isShippoConfigured()) return trackViaShippo(trackingNumber, carrier);
  return trackShipment(trackingNumber);
}
