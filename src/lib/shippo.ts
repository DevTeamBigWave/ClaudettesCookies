import { env } from "@/lib/env";
import { SHIP_FROM } from "@/lib/ship-from";
import type { DeliveryStatus, TrackResult, LabelRecipient, FedExLabel } from "@/lib/fedex";

/**
 * Shippo multi-carrier shipping: live rates, labels, and tracking via your
 * Shippo account (USPS is built in — no carrier connection needed). Ship-from
 * comes from SHIP_FROM (code config), so no FedEx env vars are required.
 */
const BASE = "https://api.goshippo.com";

// A standard 6-cookie box. Override later if your packaging differs.
const PARCEL = { length: "9", width: "6", height: "3", distance_unit: "in" as const };

export function isShippoConfigured(): boolean {
  return Boolean(env.SHIPPO_API_TOKEN);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `ShippoToken ${env.SHIPPO_API_TOKEN}`,
  };
}

async function shippoError(res: Response, what: string): Promise<string> {
  const raw = await res.text().catch(() => "");
  let detail = raw.slice(0, 300);
  try {
    const j = JSON.parse(raw) as { detail?: string; messages?: Array<{ text?: string }> };
    detail = j.detail || j.messages?.map((m) => m.text).filter(Boolean).join(" ") || detail;
  } catch {
    /* keep raw */
  }
  return `Shippo ${what} failed (${res.status}): ${detail}`;
}

export interface ShipTo {
  name?: string | null;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

type ShippoRate = {
  object_id: string;
  provider: string;
  amount: string;
  servicelevel?: { name?: string; token?: string };
  estimated_days?: number;
};

export interface RateOption {
  /** Shippo rate object id — buy this exact rate when generating the label. */
  rateId: string;
  /** Stable service identifier (e.g. "usps_priority"); survives a re-quote, so
   *  it's what the client sends back and the server re-derives the price from. */
  serviceToken: string;
  carrier: string;
  service: string;
  amountCents: number;
  estimatedDays: number | null;
}

/** Create a Shippo shipment (from SHIP_FROM to `to`) and return its rates. */
async function createShipment(to: ShipTo, weightLb: number): Promise<ShippoRate[]> {
  if (!isShippoConfigured()) throw new Error("Shippo isn't configured (set SHIPPO_API_TOKEN).");
  const res = await fetch(`${BASE}/shipments/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      address_from: {
        name: SHIP_FROM.name,
        street1: SHIP_FROM.street,
        city: SHIP_FROM.city,
        state: SHIP_FROM.state,
        zip: SHIP_FROM.zip,
        country: "US",
        phone: SHIP_FROM.phone,
        email: SHIP_FROM.email,
      },
      address_to: {
        name: to.name || "Customer",
        street1: to.line1,
        street2: to.line2 || "",
        city: to.city,
        state: to.state,
        zip: to.postalCode,
        country: "US",
        phone: to.phone || SHIP_FROM.phone,
      },
      parcels: [
        {
          ...PARCEL,
          weight: Math.max(0.1, Number(weightLb.toFixed(2))).toString(),
          mass_unit: "lb",
        },
      ],
      async: false,
    }),
  });
  if (!res.ok) throw new Error(await shippoError(res, "create shipment"));
  const shipment = (await res.json()) as { rates?: ShippoRate[] };
  return shipment.rates ?? [];
}

/** Live rates to a destination, preferred carrier first (default USPS), cheapest→. */
export async function getShippoRates(to: ShipTo, weightLb: number): Promise<RateOption[]> {
  const rates = await createShipment(to, weightLb);
  if (rates.length === 0) return [];
  const preferred = (env.SHIPPO_CARRIER || "USPS").toLowerCase();
  const filtered = rates.filter((r) => r.provider.toLowerCase() === preferred);
  const use = filtered.length ? filtered : rates;
  return use
    .map((r) => ({
      rateId: r.object_id,
      serviceToken: r.servicelevel?.token || r.object_id,
      carrier: r.provider,
      service: r.servicelevel?.name || "Shipping",
      amountCents: Math.round(Number(r.amount) * 100),
      estimatedDays: r.estimated_days ?? null,
    }))
    .sort((a, b) => a.amountCents - b.amountCents);
}

/** Buy a label. If `rateId` is given (from a live quote), buys that exact rate;
 *  otherwise re-quotes and buys the cheapest of the preferred carrier. */
export async function createShippoLabel(opts: {
  recipient: LabelRecipient;
  weightLb: number;
  rateId?: string | null;
}): Promise<FedExLabel & { carrier: string; qrCodeUrl: string | null }> {
  if (!isShippoConfigured()) throw new Error("Shippo isn't configured (set SHIPPO_API_TOKEN).");

  let rateId = opts.rateId || null;
  let carrier = "USPS";
  if (!rateId) {
    const rates = await createShipment(
      {
        name: opts.recipient.name,
        phone: opts.recipient.phone,
        line1: opts.recipient.line1,
        line2: opts.recipient.line2,
        city: opts.recipient.city,
        state: opts.recipient.state,
        postalCode: opts.recipient.postalCode,
      },
      opts.weightLb,
    );
    if (rates.length === 0) {
      throw new Error("Shippo returned no rates — check the addresses and your connected carriers.");
    }
    const preferred = (env.SHIPPO_CARRIER || "USPS").toLowerCase();
    const cheapest = (list: ShippoRate[]) =>
      [...list].sort((a, b) => Number(a.amount) - Number(b.amount))[0];
    const rate = cheapest(rates.filter((r) => r.provider.toLowerCase() === preferred)) ?? cheapest(rates);
    rateId = rate.object_id;
    carrier = rate.provider;
  }

  const txRes = await fetch(`${BASE}/transactions/`, {
    method: "POST",
    headers: authHeaders(),
    // qr_code_requested asks Shippo for a USPS Label Broker QR code alongside the
    // PDF — drop the package at USPS and they scan the QR to print the label, no
    // printer needed. The carrier returns qr_code_url only when it's supported.
    body: JSON.stringify({
      rate: rateId,
      label_file_type: "PDF",
      qr_code_requested: true,
      async: false,
    }),
  });
  if (!txRes.ok) throw new Error(await shippoError(txRes, "buy label"));
  const tx = (await txRes.json()) as {
    status: string;
    tracking_number?: string;
    label_url?: string;
    qr_code_url?: string;
    messages?: Array<{ text?: string }>;
  };
  if (tx.status !== "SUCCESS" || !tx.label_url || !tx.tracking_number) {
    const msg = tx.messages?.map((m) => m.text).filter(Boolean).join(" ") || tx.status;
    throw new Error(`Shippo couldn't create the label: ${msg}`);
  }

  const pdfRes = await fetch(tx.label_url);
  if (!pdfRes.ok) throw new Error("Could not download the Shippo label PDF.");
  const labelBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");

  return { trackingNumber: tx.tracking_number, labelBase64, carrier, qrCodeUrl: tx.qr_code_url ?? null };
}

const CARRIER_TOKEN: Record<string, string> = {
  fedex: "fedex",
  usps: "usps",
  ups: "ups",
  dhl: "dhl_express",
};

/** Live delivery status for a tracking number via Shippo. */
export async function trackViaShippo(
  trackingNumber: string,
  carrier?: string | null,
): Promise<TrackResult> {
  if (!isShippoConfigured()) throw new Error("Shippo isn't configured.");
  const token = CARRIER_TOKEN[(carrier || "usps").toLowerCase()] ?? (carrier || "usps").toLowerCase();
  const res = await fetch(`${BASE}/tracks/${token}/${encodeURIComponent(trackingNumber)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await shippoError(res, "track"));

  const json = (await res.json()) as { tracking_status?: { status?: string; status_date?: string } };
  const s = (json.tracking_status?.status || "").toUpperCase();
  let status: DeliveryStatus = "unknown";
  if (s === "DELIVERED") status = "delivered";
  else if (s === "TRANSIT") status = "in_transit";
  else if (s === "PRE_TRANSIT") status = "label_created";
  else if (s === "FAILURE" || s === "RETURNED") status = "exception";

  return {
    status,
    statusText: json.tracking_status?.status || "Unknown",
    deliveredAt: status === "delivered" ? (json.tracking_status?.status_date ?? null) : null,
  };
}
