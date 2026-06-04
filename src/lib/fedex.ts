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
