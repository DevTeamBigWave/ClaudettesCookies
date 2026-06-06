import { env } from "@/lib/env";

/**
 * Minimal Google Calendar client using OAuth user credentials — no SDK, and no
 * service-account key (which the org's `iam.disableServiceAccountKeyCreation`
 * policy blocks anyway).
 *
 * Flow: exchange a long-lived refresh token for a short-lived access token,
 * then insert events via the Calendar REST API. The refresh token is minted
 * once through the standard consent flow; the authenticating user owns the
 * target calendar, so no sharing step is needed. All config is optional;
 * callers check `isCalendarConfigured()` and skip silently when it's absent, so
 * a missing credential never breaks checkout.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function isCalendarConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN,
  );
}

// Access tokens last ~1 hour; cache in module memory and refresh before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN!,
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

export interface CalendarEventInput {
  summary: string;
  description?: string;
  /** YYYY-MM-DD for an all-day event. */
  date: string;
}

/** Insert an all-day event. Returns the created event id, or null. Throws on API error. */
export async function createCalendarEvent(input: CalendarEventInput): Promise<string | null> {
  const token = await getAccessToken();
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
