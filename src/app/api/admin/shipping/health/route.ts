import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { isShippoConfigured, getShippoRates } from "@/lib/shippo";

export const runtime = "nodejs";

/**
 * Admin-only Shippo connectivity check. Confirms the configured token
 * authenticates and returns live USPS rates — using a free rate quote (no label
 * is bought, no postage is spent). Visit /api/admin/shipping/health while signed
 * in as staff/admin to verify the live key is wired up.
 */
export async function GET() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isShippoConfigured()) {
    return NextResponse.json({ ok: false, configured: false, message: "SHIPPO_API_TOKEN is not set." });
  }

  const token = env.SHIPPO_API_TOKEN ?? "";
  const mode = token.startsWith("shippo_live_")
    ? "live"
    : token.startsWith("shippo_test_")
      ? "test"
      : "unknown";

  // Sample quote to a real US address (a free Shippo call — no purchase).
  try {
    const rates = await getShippoRates(
      { name: "Test Recipient", line1: "1600 Amphitheatre Pkwy", city: "Mountain View", state: "CA", postalCode: "94043" },
      1,
    );
    return NextResponse.json({
      ok: rates.length > 0,
      configured: true,
      mode,
      preferredCarrier: env.SHIPPO_CARRIER,
      rateCount: rates.length,
      cheapest: rates[0]
        ? { carrier: rates[0].carrier, service: rates[0].service, amount: `$${(rates[0].amountCents / 100).toFixed(2)}` }
        : null,
      message:
        rates.length > 0
          ? `Shippo ${mode} key is working — ${rates.length} ${env.SHIPPO_CARRIER} rate(s) returned.`
          : "Shippo authenticated but returned no rates for the test address.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      configured: true,
      mode,
      message: e instanceof Error ? e.message : "Shippo rate check failed.",
    });
  }
}
