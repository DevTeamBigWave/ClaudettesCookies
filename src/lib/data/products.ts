import { createClient } from "@/lib/supabase/server";
import type { ProductWithRelations } from "@/types/db";

const SELECT = "*, product_images(*), product_variants(*)";

/**
 * Re-run a storefront read a couple of times before giving up. Supabase reads
 * occasionally fail with a transient network blip, and the storefront renders
 * dynamically (pages read cookies), so a single failure would otherwise surface
 * the full-page error boundary. Short backoff lets a blip self-heal; a genuine
 * outage still throws after the final attempt.
 */
async function selectWithRetry(
  run: () => PromiseLike<{ data: unknown; error: unknown }>,
  attempts = 3,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data, error } = await run();
    if (!error) return data;
    lastError = error;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
  }
  throw lastError;
}

/** All active products for the storefront, ordered for display. */
export async function getActiveProducts(): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  const data = await selectWithRetry(() =>
    supabase
      .from("products")
      .select(SELECT)
      .eq("status", "active")
      .order("position", { ascending: true }),
  );
  return (data as ProductWithRelations[] | null) ?? [];
}

export async function getFeaturedProducts(limit = 3): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  const data = await selectWithRetry(() =>
    supabase
      .from("products")
      .select(SELECT)
      .eq("status", "active")
      .eq("featured", true)
      .order("position", { ascending: true })
      .limit(limit),
  );
  return (data as ProductWithRelations[] | null) ?? [];
}

/** Stable handle for the Build-Your-Own box product. */
export const BUILD_YOUR_OWN_HANDLE = "build-your-own";

/** The number of cookies a Build-Your-Own box must contain. */
export const BOX_SIZE = 6;

/** A single pickable flavor for the Build-Your-Own box. */
export interface Flavor {
  handle: string;
  /** Short, customer-facing flavor name (the part before the em dash). */
  name: string;
  image: string | null;
  allergens: string[] | null;
}

/**
 * Active single-flavor products that can be chosen inside a Build-Your-Own box.
 * Seasonal specials appear here automatically once flagged `is_flavor`.
 */
export async function getFlavors(): Promise<Flavor[]> {
  const supabase = await createClient();
  const data = await selectWithRetry(() =>
    supabase
      .from("products")
      .select("handle, title, is_flavor, status, position, product_images(url, position)")
      .eq("status", "active")
      .eq("is_flavor", true)
      .order("position", { ascending: true }),
  );
  return ((data as ProductWithRelations[] | null) ?? []).map((p) => ({
    handle: p.handle,
    name: p.title.split("—")[0].trim(),
    image: p.product_images?.sort((a, b) => a.position - b.position)[0]?.url ?? null,
    allergens: p.allergens ?? null,
  }));
}

export async function getProductByHandle(
  handle: string,
): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("handle", handle)
    .maybeSingle();
  return (data as unknown as ProductWithRelations | null) ?? null;
}
