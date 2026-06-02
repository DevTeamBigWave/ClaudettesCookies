import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { supabaseUrl } from "./url";

/** Browser Supabase client (anon key, subject to RLS). Use in client components. */
export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
