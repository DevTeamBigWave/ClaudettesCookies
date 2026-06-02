/**
 * The Supabase project origin, normalized.
 *
 * The Supabase dashboard surfaces the API URL as `…supabase.co/rest/v1/`, and
 * pasting that whole value into NEXT_PUBLIC_SUPABASE_URL makes the client build a
 * doubled `/rest/v1//rest/v1/...` request path that 404s as PGRST125
 * ("Invalid path specified in request URL"). Reducing to the origin strips any
 * `/rest/v1`, stray path, or trailing slash.
 *
 * Used by every Supabase client so the normalization is identical across the
 * node, edge, and browser runtimes. Never throws (falls back to a trailing-slash
 * trim) so a malformed value degrades instead of crashing client construction.
 */
export function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}
