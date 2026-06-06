import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { buildConsentUrl, hasOAuthClient } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIRECT_PATH = "/api/integrations/google/callback";

/** Kick off the Google OAuth consent flow for Calendar access. */
export async function GET() {
  await requireAdmin();

  if (!hasOAuthClient()) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_SITE_URL}/admin/integrations?error=missing_client`);
  }

  // CSRF: round-trip a random state through a short-lived httpOnly cookie.
  const state = crypto.randomBytes(16).toString("hex");
  const url = buildConsentUrl(`${env.NEXT_PUBLIC_SITE_URL}${REDIRECT_PATH}`, state);

  const res = NextResponse.redirect(url);
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
