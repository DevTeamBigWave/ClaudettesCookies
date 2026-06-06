import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Minimal Google Calendar client using a service account — no SDK dependency.
 *
 * Flow: sign a JWT with the service account's private key, exchange it for an
 * access token, then insert events via the Calendar REST API. The target
 * calendar must be shared with the service account's email ("Make changes to
 * events"). All config is optional; callers check `isCalendarConfigured()` and
 * skip silently when it's absent, so a missing key never breaks checkout.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function isCalendarConfigured(): boolean {
  return Boolean(
    env.GOOGLE_CALENDAR_CLIENT_EMAIL &&
      env.GOOGLE_CALENDAR_PRIVATE_KEY &&
      env.GOOGLE_CALENDAR_ID,
  );
}

// Tokens last ~1 hour; cache in module memory and refresh just before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: env.GOOGLE_CALENDAR_CLIENT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const signingInput = `${header}.${claims}`;
  // Service-account keys often arrive with newlines escaped as literal "\n".
  const privateKey = (env.GOOGLE_CALENDAR_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 200)}`);
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
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID!);
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
