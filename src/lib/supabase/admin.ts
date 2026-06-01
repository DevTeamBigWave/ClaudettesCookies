import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only.
 * Use exclusively inside route handlers / cron / webhooks for privileged writes
 * (finalizing orders, decrementing inventory, sending campaigns). Never import
 * this into a client component.
 *
 * Intentionally untyped: this client performs flexible privileged reads/writes
 * across every table (including dynamic relational selects). Callers narrow the
 * shape they read via the interfaces in `@/types/db`.
 */
export function createAdminClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
