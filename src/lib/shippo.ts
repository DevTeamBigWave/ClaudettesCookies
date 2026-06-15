import { env } from "@/lib/env";
import type { DeliveryStatus, TrackResult, LabelRecipient, FedExLabel } from "@/lib/fedex";

/**
 * Shippo multi-carrier shipping. Talks to your connected carrier account(s)
 * (FedEx/USPS/UPS) through Shippo's API, so labels + tracking work without
 * fighting FedEx's direct production-API approval. Reuses the FEDEX_SHIP_FROM_*
 * env fields as the ship-from origin.
 */
const BASE = "https://api.goshippo.com";

// A standard 6-cookie box. Override later if your packaging differs.
const PARCEL = { length: "9", width: "6", height: "3", distance_unit: "in" as const };

export function isShippoConfigured(): boolean {
  return Boolean(
    env.SHIPPO_API_TOKEN &&
      env.FEDEX_SHIP_FROM_NAME &&
      env.FEDEX_SHIP_FROM_STREET &&
      env.FEDEX_SHIP_FROM_CITY &&
      env.FEDEX_SHIP_FROM_STATE &&
      (env.FEDEX_SHIP_FROM_ZIP || env.FEDEX_ORIGIN_ZIP),
  );
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

/** Create + buy a real label via Shippo, returning tracking + the PDF (base64). */
export async function createShippoLabel(opts: {
  recipient: LabelRecipient;
  weightLb: number;
}): Promise<FedExLabel & { carrier: string }> {
  if (!isShippoConfigured()) {
    throw new Error("Shippo isn't configured (set SHIPPO_API_TOKEN and the ship-from address).");
  }
  const fromZip = env.FEDEX_SHIP_FROM_ZIP || env.FEDEX_ORIGIN_ZIP!;

  // 1) Create a shipment to get live rates.
  const shipRes = await fetch(`${BASE}/shipments/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      address_from: {
        name: env.FEDEX_SHIP_FROM_NAME,
        street1: env.FEDEX_SHIP_FROM_STREET,
        city: env.FEDEX_SHIP_FROM_CITY,
        state: env.FEDEX_SHIP_FROM_STATE,
        zip: fromZip,
        country: "US",
        phone: env.FEDEX_SHIP_FROM_PHONE,
      },
      address_to: {
        name: opts.recipient.name,
        street1: opts.recipient.line1,
        street2: opts.recipient.line2 || "",
        city: opts.recipient.city,
        state: opts.recipient.state,
        zip: opts.recipient.postalCode,
        country: "US",
        phone: opts.recipient.phone || env.FEDEX_SHIP_FROM_PHONE,
      },
      parcels: [
        {
          ...PARCEL,
          weight: Math.max(0.1, Number(opts.weightLb.toFixed(2))).toString(),
          mass_unit: "lb",
        },
      ],
      async: false,
    }),
  });
  if (!shipRes.ok) throw new Error(await shippoError(shipRes, "create shipment"));

  const shipment = (await shipRes.json()) as {
    rates?: Array<{ object_id: string; provider: string; amount: string; servicelevel?: { name?: string } }>;
  };
  const rates = shipment.rates ?? [];
  if (rates.length === 0) {
    throw new Error("Shippo returned no rates — check your connected carriers and the addresses.");
  }

  // Prefer the configured carrier (default FedEx); fall back to the cheapest.
  const cheapest = (list: typeof rates) =>
    [...list].sort((a, b) => Number(a.amount) - Number(b.amount))[0];
  const preferred = (env.SHIPPO_CARRIER || "FedEx").toLowerCase();
  const rate =
    cheapest(rates.filter((r) => r.provider.toLowerCase() === preferred)) ?? cheapest(rates);

  // 2) Buy the label.
  const txRes = await fetch(`${BASE}/transactions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ rate: rate.object_id, label_file_type: "PDF", async: false }),
  });
  if (!txRes.ok) throw new Error(await shippoError(txRes, "buy label"));

  const tx = (await txRes.json()) as {
    status: string;
    tracking_number?: string;
    label_url?: string;
    messages?: Array<{ text?: string }>;
  };
  if (tx.status !== "SUCCESS" || !tx.label_url || !tx.tracking_number) {
    const msg = tx.messages?.map((m) => m.text).filter(Boolean).join(" ") || tx.status;
    throw new Error(`Shippo couldn't create the label: ${msg}`);
  }

  // 3) Download the hosted PDF so it can be stored like a FedEx label.
  const pdfRes = await fetch(tx.label_url);
  if (!pdfRes.ok) throw new Error("Could not download the Shippo label PDF.");
  const labelBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");

  return { trackingNumber: tx.tracking_number, labelBase64, carrier: rate.provider };
}

// Shippo tracking carrier tokens.
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
  const token = CARRIER_TOKEN[(carrier || "fedex").toLowerCase()] ?? (carrier || "fedex").toLowerCase();
  const res = await fetch(`${BASE}/tracks/${token}/${encodeURIComponent(trackingNumber)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await shippoError(res, "track"));

  const json = (await res.json()) as {
    tracking_status?: { status?: string; status_date?: string };
  };
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
