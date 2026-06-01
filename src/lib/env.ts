import { z } from "zod";

/**
 * Validate environment at module load so a misconfigured deploy fails fast and
 * loudly instead of throwing deep inside a request. Server-only secrets are
 * kept off the client bundle by never importing them into client components.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
  RESEND_REPLY_TO: z.string().optional(),
  CRON_SECRET: z.string().min(16),
  ADMIN_EMAILS: z.string().default(""),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: true,
});

const isServer = typeof window === "undefined";

function load() {
  // On the client only NEXT_PUBLIC_* are inlined by Next; validate just those.
  const schema = isServer ? serverSchema : clientSchema;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration — see logs above.");
  }
  return parsed.data;
}

export const env = load() as z.infer<typeof serverSchema>;

/** Emails that should be auto-promoted to the `admin` role on first sign-in. */
export const adminEmails = env.ADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
