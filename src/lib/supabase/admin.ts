import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only.
 * Use exclusively inside route handlers / cron / webhooks for privileged writes
 * (finalizing orders, decrementing inventory, sending campaigns). Never import
 * this into a client component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
