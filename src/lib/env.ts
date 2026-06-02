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
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().transform((s) => s.replace(/\/+$/, "")),
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
  CRON_SECRET: z.string().min(16).optional(),
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
    if (isBuildPhase) {
      // Don't crash the build — runtime access will re-validate and fail loudly
      // with the same message if a variable is still missing when served.
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
