import { env } from "@/lib/env";

/**
 * Minimal FedEx REST client for live shipping rates.
 *
 * Uses the modern developer.fedex.com platform (OAuth2 client-credentials +
 * the Rate & Transit Times API). All FedEx config is optional: callers should
 * check `isFedExConfigured()` and fall back to flat-rate shipping when it's
 * false, so a missing credential degrades one feature instead of breaking
 * checkout.
 */

const BASE =
  env.FEDEX_ENV === "production"
    ? "https://apis.fedex.com"
    : "https://apis-sandbox.fedex.com";

/** True when every credential needed to request a rate is present. */
export function isFedExConfigured(): boolean {
  return Boolean(
    env.FEDEX_API_KEY &&
      env.FEDEX_API_SECRET &&
      env.FEDEX_ACCOUNT_NUMBER &&
      env.FEDEX_ORIGIN_ZIP,
  );
}

/**
 * True when, on top of rate credentials, the full ship-from contact + address
 * needed to print a real FedEx label is configured. Gates the admin "Generate
 * label" action so it degrades cleanly when the origin isn't set up.
 */
export function isFedExShipConfigured(): boolean {
  return Boolean(
    isFedExConfigured() &&
      env.FEDEX_SHIP_FROM_NAME &&
      env.FEDEX_SHIP_FROM_PHONE &&
      env.FEDEX_SHIP_FROM_STREET &&
      env.FEDEX_SHIP_FROM_CITY &&
      env.FEDEX_SHIP_FROM_STATE &&
      (env.FEDEX_SHIP_FROM_ZIP || env.FEDEX_ORIGIN_ZIP),
  );
}

// FedEx service codes we treat as the "Express" tier. Everything else (ground
// services) falls into "Regular". Ordered cheapest-intent first isn't needed —
// we sort by price when picking.
const EXPRESS_SERVICE_CODES = new Set([
  "FIRST_OVERNIGHT",
  "PRIORITY_OVERNIGHT",
  "STANDARD_OVERNIGHT",
  "FEDEX_2_DAY",
  "FEDEX_2_DAY_AM",
  "FEDEX_EXPRESS_SAVER",
  "INTERNATIONAL_PRIORITY",
  "INTERNATIONAL_ECONOMY",
]);

/** A FedEx-derived option re-badged as one of our two customer-facing tiers. */
export interface TieredShippingOption extends ShippingOption {
  /** The tier label shown at checkout. */
  tier: "Regular" | "Express";
}

/**
 * Collapse a list of live FedEx services into (at most) the two tiers we offer.
 * Regular = cheapest ground service; Express = cheapest expedited service. When
 * FedEx only returns one bucket we still surface what we have, so callers can
 * decide whether to synthesize the missing tier from a flat rate.
 */
export function splitTiers(options: ShippingOption[]): {
  regular: TieredShippingOption | null;
  express: TieredShippingOption | null;
} {
  const cheapest = (list: ShippingOption[]) =>
    list.length ? [...list].sort((a, b) => a.amountCents - b.amountCents)[0] : null;

  const expressOpts = options.filter((o) => EXPRESS_SERVICE_CODES.has(o.serviceType));
  const groundOpts = options.filter((o) => !EXPRESS_SERVICE_CODES.has(o.serviceType));

  const regularPick = cheapest(groundOpts) ?? cheapest(options);
  // Express must be a different service than Regular; if the only express option
  // is also the regular pick, drop it so we don't show the same rate twice.
  const expressPick =
    cheapest(expressOpts) ??
    cheapest(options.filter((o) => o.serviceType !== regularPick?.serviceType));

  const regular: TieredShippingOption | null = regularPick
    ? { ...regularPick, tier: "Regular", label: "Regular" }
    : null;
  const express: TieredShippingOption | null =
    expressPick && expressPick.serviceType !== regular?.serviceType
      ? { ...expressPick, tier: "Express", label: "Express" }
      : null;

  return { regular, express };
}

export interface ShippingOption {
  /** FedEx service code, e.g. "FEDEX_GROUND", "FEDEX_2_DAY". */
  serviceType: string;
  /** Human-friendly label for the UI. */
  label: string;
  /** Total charge in integer cents (matches the rest of our pricing). */
  amountCents: number;
  /** Estimated transit time in business days, when FedEx provides it. */
  transitDays: number | null;
}

// FedEx access tokens last ~1 hour. Cache the token in module memory and refresh
// a minute before expiry so a burst of quotes shares one token.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.FEDEX_API_KEY!,
      client_secret: env.FEDEX_API_SECRET!,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FedEx OAuth failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/** Title-case a FedEx service code as a readable fallback label. */
function prettifyService(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => (w === "fedex" ? "FedEx" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Best-effort transit-day extraction; FedEx exposes this inconsistently. */
function transitDays(detail: Record<string, unknown>): number | null {
  const commit = detail.commit as { transitDays?: { minimumTransitTime?: string } } | undefined;
  const raw = commit?.transitDays?.minimumTransitTime; // e.g. "TWO_DAYS"
  const map: Record<string, number> = {
    ONE_DAY: 1, TWO_DAYS: 2, THREE_DAYS: 3, FOUR_DAYS: 4,
    FIVE_DAYS: 5, SIX_DAYS: 6, SEVEN_DAYS: 7, EIGHT_DAYS: 8,
  };
  return raw && raw in map ? map[raw] : null;
}

/**
 * Request live rates from FedEx for a single package to a US destination ZIP.
 * Returns options sorted cheapest-first. Throws on transport/credential errors
 * so the caller can fall back to flat-rate.
 */
export async function getFedExRates(opts: {
  destZip: string;
  weightLb: number;
  residential?: boolean;
}): Promise<ShippingOption[]> {
  const accessToken = await getAccessToken();
  const body = {
    accountNumber: { value: env.FEDEX_ACCOUNT_NUMBER },
    requestedShipment: {
      shipper: { address: { postalCode: env.FEDEX_ORIGIN_ZIP, countryCode: "US" } },
      recipient: {
        address: {
          postalCode: opts.destZip,
          countryCode: "US",
          residential: opts.residential ?? true,
        },
      },
      pickupType: "USE_SCHEDULED_PICKUP",
      // ACCOUNT = your negotiated rate; LIST is the published fallback.
      rateRequestType: ["ACCOUNT", "LIST"],
      requestedPackageLineItems: [
        // FedEx rejects zero weight; clamp to a tiny minimum.
        { weight: { units: "LB", value: Math.max(0.1, Number(opts.weightLb.toFixed(2))) } },
      ],
    },
  };

  const res = await fetch(`${BASE}/rate/v1/rates/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-locale": "en_US",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FedEx rate request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    output?: { rateReplyDetails?: Array<Record<string, unknown>> };
  };
  const details = json.output?.rateReplyDetails ?? [];

  const options: ShippingOption[] = [];
  for (const d of details) {
    const rated = d.ratedShipmentDetails as
      | Array<{ rateType?: string; totalNetCharge?: number }>
      | undefined;
    // Prefer the account (negotiated) rate; fall back to the first returned.
    const pick = rated?.find((r) => r.rateType === "ACCOUNT") ?? rated?.[0];
    const amount = pick?.totalNetCharge;
    const serviceType = String(d.serviceType ?? "");
    if (typeof amount !== "number" || !serviceType) continue;
    options.push({
      serviceType,
      label: typeof d.serviceName === "string" ? d.serviceName : prettifyService(serviceType),
      amountCents: Math.round(amount * 100),
      transitDays: transitDays(d),
    });
  }

  return options.sort((a, b) => a.amountCents - b.amountCents);
}

export type DeliveryStatus = "in_transit" | "delivered" | "exception" | "unknown";

export interface TrackResult {
  status: DeliveryStatus;
  /** Human-readable status from FedEx, e.g. "Delivered", "On FedEx vehicle for delivery". */
  statusText: string;
  /** ISO timestamp of actual delivery, when delivered. */
  deliveredAt: string | null;
}

/**
 * Look up live delivery status for a tracking number via the FedEx Track API.
 * Unlike Ship, this neither bills nor creates anything — it just reads status —
 * so it's safe to poll. Throws on transport/credential errors.
 */
export async function trackShipment(trackingNumber: string): Promise<TrackResult> {
  if (!isFedExConfigured()) throw new Error("FedEx isn't configured for tracking.");
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/track/v1/trackingnumbers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-locale": "en_US",
    },
    body: JSON.stringify({
      includeDetailedScans: false,
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
    }),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw.slice(0, 300);
    try {
      const j = JSON.parse(raw) as { errors?: Array<{ message?: string }> };
      if (Array.isArray(j.errors) && j.errors.length) {
        msg = j.errors.map((e) => e.message).filter(Boolean).join(" ") || msg;
      }
    } catch {
      /* keep raw */
    }
    throw new Error(`FedEx couldn't fetch tracking (${res.status}): ${msg}`);
  }

  const json = (await res.json()) as {
    output?: {
      completeTrackResults?: Array<{
        trackResults?: Array<{
          latestStatusDetail?: { code?: string; derivedCode?: string; statusByLocale?: string; description?: string };
          dateAndTimes?: Array<{ type?: string; dateTime?: string }>;
        }>;
      }>;
    };
  };

  const tr = json.output?.completeTrackResults?.[0]?.trackResults?.[0];
  const code = (tr?.latestStatusDetail?.derivedCode || tr?.latestStatusDetail?.code || "").toUpperCase();
  const statusText = tr?.latestStatusDetail?.statusByLocale || tr?.latestStatusDetail?.description || "Unknown";
  const deliveredAt = tr?.dateAndTimes?.find((d) => d.type === "ACTUAL_DELIVERY")?.dateTime ?? null;

  let status: DeliveryStatus = "in_transit";
  if (code === "DL") status = "delivered";
  else if (["DE", "SE", "CA", "RS", "RD"].includes(code)) status = "exception"; // delivery/shipment exception, cancelled, returned
  else if (!code) status = "unknown";

  return { status, statusText, deliveredAt: status === "delivered" ? deliveredAt : null };
}

/** Destination contact + address for a shipment, as we store it on the order. */
export interface LabelRecipient {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface FedExLabel {
  trackingNumber: string;
  /** Base64-encoded PDF label, ready to write to storage. */
  labelBase64: string;
}

/**
 * Generate a real FedEx shipping label via the Ship API. Creates an actual
 * shipment on the FedEx account and returns the tracking number plus the label
 * PDF (base64). Throws on any transport/validation error so the admin route can
 * surface it — unlike rating, we never silently fall back here.
 */
export async function createFedExLabel(opts: {
  recipient: LabelRecipient;
  weightLb: number;
  /** FedEx service code; defaults to ground when the order's tier had none. */
  serviceType?: string;
}): Promise<FedExLabel> {
  if (!isFedExShipConfigured()) {
    throw new Error("FedEx Ship API isn't fully configured (missing ship-from address).");
  }
  const accessToken = await getAccessToken();
  const fromZip = env.FEDEX_SHIP_FROM_ZIP || env.FEDEX_ORIGIN_ZIP!;
  const serviceType = opts.serviceType && opts.serviceType !== "FLAT" ? opts.serviceType : "FEDEX_GROUND";

  const body = {
    labelResponseOptions: "LABEL",
    accountNumber: { value: env.FEDEX_ACCOUNT_NUMBER },
    requestedShipment: {
      shipDatestamp: new Date().toISOString().slice(0, 10),
      pickupType: "USE_SCHEDULED_PICKUP",
      serviceType,
      packagingType: "YOUR_PACKAGING",
      blockInsightVisibility: false,
      shipper: {
        contact: {
          personName: env.FEDEX_SHIP_FROM_NAME,
          phoneNumber: env.FEDEX_SHIP_FROM_PHONE,
          companyName: env.FEDEX_SHIP_FROM_NAME,
        },
        address: {
          streetLines: [env.FEDEX_SHIP_FROM_STREET],
          city: env.FEDEX_SHIP_FROM_CITY,
          stateOrProvinceCode: env.FEDEX_SHIP_FROM_STATE,
          postalCode: fromZip,
          countryCode: "US",
        },
      },
      recipients: [
        {
          contact: {
            personName: opts.recipient.name,
            phoneNumber: opts.recipient.phone || env.FEDEX_SHIP_FROM_PHONE,
          },
          address: {
            streetLines: [opts.recipient.line1, opts.recipient.line2 ?? ""].filter(Boolean),
            city: opts.recipient.city,
            stateOrProvinceCode: opts.recipient.state,
            postalCode: opts.recipient.postalCode,
            countryCode: "US",
            residential: true,
          },
        },
      ],
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: { responsibleParty: { accountNumber: { value: env.FEDEX_ACCOUNT_NUMBER } } },
      },
      labelSpecification: {
        imageType: "PDF",
        labelStockType: "PAPER_85X11_TOP_HALF_LABEL",
      },
      requestedPackageLineItems: [
        { weight: { units: "LB", value: Math.max(0.1, Number(opts.weightLb.toFixed(2))) } },
      ],
    },
  };

  const res = await fetch(`${BASE}/ship/v1/shipments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-locale": "en_US",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // FedEx returns a JSON error envelope ({ errors: [{ code, message }] }).
    // Surface the human-readable message(s) instead of dumping raw JSON.
    const raw = await res.text().catch(() => "");
    let msg = raw.slice(0, 300);
    try {
      const j = JSON.parse(raw) as { errors?: Array<{ message?: string }> };
      if (Array.isArray(j.errors) && j.errors.length) {
        msg = j.errors.map((e) => e.message).filter(Boolean).join(" ") || msg;
      }
    } catch {
      /* not JSON — keep the trimmed raw text */
    }
    throw new Error(`FedEx couldn't create the label (${res.status}): ${msg}`);
  }

  const json = (await res.json()) as {
    output?: {
      transactionShipments?: Array<{
        masterTrackingNumber?: string;
        pieceResponses?: Array<{
          trackingNumber?: string;
          packageDocuments?: Array<{ encodedLabel?: string; url?: string }>;
        }>;
      }>;
    };
  };

  const shipment = json.output?.transactionShipments?.[0];
  const piece = shipment?.pieceResponses?.[0];
  const trackingNumber = piece?.trackingNumber ?? shipment?.masterTrackingNumber;
  const labelBase64 = piece?.packageDocuments?.find((d) => d.encodedLabel)?.encodedLabel;

  if (!trackingNumber || !labelBase64) {
    throw new Error("FedEx returned no label/tracking number for the shipment.");
  }
  return { trackingNumber, labelBase64 };
}
