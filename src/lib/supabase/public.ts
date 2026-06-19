import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { supabaseUrl } from "./url";

/**
 * Cookie-free Supabase client for **public catalog reads** (anon key, RLS
 * enforced as the anonymous role).
 *
 * The cookie-bound server client in `./server` reads `cookies()`, which is a
 * dynamic API: any page that touches it is forced into per-request SSR, which
 * silently overrides `export const revalidate`. Public catalog data (active
 * products, published posts) doesn't depend on the visitor's session, so reading
 * it through this client keeps the storefront pages statically renderable and
 * lets their ISR (`revalidate`) actually take effect.
 *
 * Use this only for data that is identical for every visitor. For anything that
 * must act *as the signed-in user*, use `createClient` from `./server`.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
