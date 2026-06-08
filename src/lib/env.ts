import { z } from "zod";

/**
 * Validate environment at module load so a misconfigured deploy fails fast and
 * loudly instead of throwing deep inside a request. Server-only secrets are
 * kept off the client bundle by never importing them into client components.
 */
const serverSchema = z.object({
  // Trailing slashes break downstream paths (Supabase builds `${url}/rest/v1/…`,
  // which becomes `//rest/v1/…` and 404s as PGRST125). Normalize them away so a
  // copy-pasted URL with a stray `/` still works.
  NEXT_PUBLIC_SITE_URL: z.string().url().transform((s) => s.replace(/\/+$/, "")),
  // Supabase clients want the bare project origin. The dashboard's "API URL"
  // shows `…supabase.co/rest/v1/`, and pasting that whole thing makes the client
  // build a doubled `/rest/v1//rest/v1/...` path that 404s as PGRST125. Reduce
  // any pasted value to its origin so `/rest/v1/`, paths, and trailing slashes
  // are all stripped.
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .transform((s) => {
      try {
        return new URL(s).origin;
      } catch {
        return s.replace(/\/+$/, "");
      }
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  // Feature-gated integrations: the storefront renders and takes payment without
  // these. Routes that need them guard at call time (email is skipped, the
  // Stripe webhook and cron endpoints fail closed) so a missing secret degrades
  // one feature instead of 500-ing every page.
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  RESEND_REPLY_TO: z.string().optional(),
  // Powers the weekly auto-generated blog post (cron). Feature-gated: the route
  // fails closed with a clear message when this isn't set.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  // Live FedEx shipping rates. Feature-gated: when any of these is missing the
  // quote endpoint falls back to flat-rate shipping instead of failing. Defaults
  // to FedEx's sandbox so test credentials are never billed; set
  // FEDEX_ENV="production" to use live rates.
  FEDEX_API_KEY: z.string().min(1).optional(),
  FEDEX_API_SECRET: z.string().min(1).optional(),
  FEDEX_ACCOUNT_NUMBER: z.string().min(1).optional(),
  FEDEX_ORIGIN_ZIP: z.string().min(3).optional(),
  FEDEX_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  // Ship-from contact + address, used only for generating real FedEx labels
  // (the Ship API needs a full origin, not just a ZIP). Feature-gated on top of
  // the rate credentials: `isFedExShipConfigured()` checks these before the
  // admin "Generate label" action is offered. FEDEX_SHIP_FROM_ZIP falls back to
  // FEDEX_ORIGIN_ZIP when unset.
  FEDEX_SHIP_FROM_NAME: z.string().min(1).optional(),
  FEDEX_SHIP_FROM_PHONE: z.string().min(1).optional(),
  FEDEX_SHIP_FROM_STREET: z.string().min(1).optional(),
  FEDEX_SHIP_FROM_CITY: z.string().min(1).optional(),
  FEDEX_SHIP_FROM_STATE: z.string().length(2).optional(),
  FEDEX_SHIP_FROM_ZIP: z.string().min(3).optional(),
  // Google Calendar order sync (OAuth user credentials — keyless, no service
  // account). Feature-gated: when the client id/secret/refresh token are
  // missing, paid orders simply aren't mirrored to the calendar. The refresh
  // token is minted once via the consent flow (see lib/google-calendar.ts).
  // GOOGLE_CALENDAR_ID defaults to "primary" (the authenticating user's own
  // calendar) when unset.
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REFRESH_TOKEN: z.string().min(1).optional(),
  GOOGLE_CALENDAR_ID: z.string().min(1).default("primary"),
  ADMIN_EMAILS: z.string().default(""),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: true,
});

const isServer = typeof window === "undefined";
// Next sets this during `next build`. Secrets aren't needed to compile, and on
// Railway they're injected at deploy time — so we validate at real runtime
// (fail-fast) but never block the build if a secret isn't present yet.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function load() {
  // On the client only NEXT_PUBLIC_* are inlined by Next; validate just those.
  const schema = isServer ? serverSchema : clientSchema;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    if (isBuildPhase || !isServer) {
      // Don't crash the build, and never hard-crash the browser: throwing here
      // would white-screen any page whose client bundle imports env over a
      // single missing NEXT_PUBLIC_* var. Log and return what we have — the
      // feature that needs the value handles its own absence. The server still
      // fails fast below.
      if (!isServer) {
        console.error("⚠️ Missing public environment variables:", parsed.error.flatten().fieldErrors);
      }
      return process.env as unknown as z.infer<typeof serverSchema>;
    }
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration — see logs above.");
  }
  return parsed.data;
}

export const env = load() as z.infer<typeof serverSchema>;

/** Emails that should be auto-promoted to the `admin` role on first sign-in. */
export const adminEmails = (env.ADMIN_EMAILS ?? "").split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
