import { env } from "@/lib/env";
import {
  GOOGLE_CALENDAR_INTEGRATION,
  getIntegration,
  upsertIntegration,
} from "@/lib/integrations";

/**
 * Minimal Google Calendar client using OAuth user credentials — no SDK, and no
 * service-account key (which the org's `iam.disableServiceAccountKeyCreation`
 * policy blocks anyway).
 *
 * The OAuth *app* credentials (client id/secret) live in env. The *user* refresh
 * token is obtained via the admin "Connect" flow and stored in the
 * `integrations` table, so the connection can be established, tested, and revoked
 * at runtime. A refresh token in env (`GOOGLE_OAUTH_REFRESH_TOKEN`) is still
 * honored as a fallback for setups configured before the Connect UI existed.
 *
 * All config is optional; `createCalendarEvent` no-ops (returns null) when the
 * integration isn't connected, so a missing credential never breaks checkout.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function appCredentials(): { clientId: string; clientSecret: string } | null {
  if (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return { clientId: env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET };
  }
  return null;
}

/** True when the OAuth app (client id/secret) is configured in env. */
export function hasOAuthClient(): boolean {
  return appCredentials() !== null;
}

/** The refresh token: DB-stored (from Connect) takes precedence over env. */
async function resolveRefreshToken(): Promise<string | null> {
  const row = await getIntegration(GOOGLE_CALENDAR_INTEGRATION);
  if (row?.refresh_token) return row.refresh_token;
  return env.GOOGLE_OAUTH_REFRESH_TOKEN ?? null;
}

// Access tokens last ~1 hour; cache in module memory and refresh before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Reset the in-memory access-token cache (after connect/disconnect). */
export function resetAccessTokenCache(): void {
  cachedToken = null;
}

async function getAccessToken(): Promise<string | null> {
  const creds = appCredentials();
  if (!creds) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const refreshToken = await resolveRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

// ── OAuth connect flow ────────────────────────────────────────────────────────

/** Build the Google consent URL. `prompt=consent` forces a refresh token to be returned. */
export function buildConsentUrl(redirectUri: string, state: string): string {
  const creds = appCredentials();
  if (!creds) throw new Error("Google OAuth client not configured (set GOOGLE_OAUTH_CLIENT_ID/SECRET).");
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: `openid email ${CALENDAR_SCOPE}`,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface ExchangedTokens {
  refreshToken: string | null;
  accessToken: string;
  expiresIn: number;
  scope: string | null;
  email: string | null;
}

/** Exchange an authorization code for tokens (server-side; uses the client secret). */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<ExchangedTokens> {
  const creds = appCredentials();
  if (!creds) throw new Error("Google OAuth client not configured.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  };
  return {
    refreshToken: json.refresh_token ?? null,
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? 3600,
    scope: json.scope ?? null,
    email: json.id_token ? emailFromIdToken(json.id_token) : null,
  };
}

/** Best-effort revoke of the stored refresh token at Google, then clear the cache. */
export async function revokeStoredToken(): Promise<void> {
  const row = await getIntegration(GOOGLE_CALENDAR_INTEGRATION);
  const token = row?.refresh_token;
  if (token) {
    try {
      await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch {
      // Best-effort: a failed revoke shouldn't block disconnect.
    }
  }
  resetAccessTokenCache();
}

/** Verify the connection by minting an access token from the refresh token. */
export async function testCalendarConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, error: "Not connected — click Connect to authorize Google." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string };
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}

// ── Event creation ────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  summary: string;
  description?: string;
  /** YYYY-MM-DD for an all-day event. */
  date: string;
}

/**
 * Insert an all-day event. Returns the created event id, or null when the
 * integration isn't connected (so callers can skip silently). Throws on API error.
 */
export async function createCalendarEvent(input: CalendarEventInput): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null; // not connected — skip

  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        // All-day event: end date is exclusive, so it's the day after start.
        start: { date: input.date },
        end: { date: nextDay(input.date) },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Calendar insert failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}

/** Format a Date as YYYY-MM-DD in the given IANA timezone (en-CA renders that shape). */
export function ymdInTimeZone(date: Date, timeZone = "America/New_York"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
