import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { exchangeCodeForTokens, resetAccessTokenCache } from "@/lib/google-calendar";
import { GOOGLE_CALENDAR_INTEGRATION, upsertIntegration } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIRECT_PATH = "/api/integrations/google/callback";

/** OAuth redirect target: exchange the code, store the refresh token, bounce back. */
export async function GET(request: Request) {
  await requireAdmin();

  const params = new URL(request.url).searchParams;
  const back = (qs: string) =>
    NextResponse.redirect(`${env.NEXT_PUBLIC_SITE_URL}/admin/integrations?${qs}`);

  const oauthError = params.get("error");
  if (oauthError) return back(`error=${encodeURIComponent(oauthError)}`);

  const code = params.get("code");
  const state = params.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("g_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return back("error=invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, `${env.NEXT_PUBLIC_SITE_URL}${REDIRECT_PATH}`);
    if (!tokens.refreshToken) {
      // Google only returns a refresh token when offline access is freshly
      // granted; prompt=consent forces it, so this is rare (revoke + retry).
      return back("error=no_refresh_token");
    }
    await upsertIntegration(GOOGLE_CALENDAR_INTEGRATION, {
      status: "connected",
      account_email: tokens.email,
      refresh_token: tokens.refreshToken,
      access_token: tokens.accessToken,
      token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
      scope: tokens.scope,
      last_error: null,
      connected_at: new Date().toISOString(),
    });
    resetAccessTokenCache();

    const res = back("connected=1");
    res.cookies.delete("g_oauth_state");
    return res;
  } catch (e) {
    return back(`error=${encodeURIComponent((e as Error).message.slice(0, 120))}`);
  }
}
