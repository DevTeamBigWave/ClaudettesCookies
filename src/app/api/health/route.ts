import { NextResponse } from "next/server";

// Railway health check target. Stays dependency-free so it reports the web
// process is up even if a downstream service is briefly unavailable.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "claudettes-cookies", ts: Date.now() });
}
