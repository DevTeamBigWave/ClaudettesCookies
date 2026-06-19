import { createPublicClient } from "@/lib/supabase/public";
import type { ProductWithRelations } from "@/types/db";

const SELECT = "*, product_images(*), product_variants(*)";

/** All active products for the storefront, ordered for display. */
export async function getActiveProducts(): Promise<ProductWithRelations[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("status", "active")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as unknown as ProductWithRelations[]) ?? [];
}

export async function getFeaturedProducts(limit = 3): Promise<ProductWithRelations[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("status", "active")
    .eq("featured", true)
    .order("position", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as ProductWithRelations[]) ?? [];
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
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("handle, title, is_flavor, status, position, product_images(url, position)")
    .eq("status", "active")
    .eq("is_flavor", true)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data as unknown as ProductWithRelations[]) ?? []).map((p) => ({
    handle: p.handle,
    name: p.title.split("—")[0].trim(),
    image: p.product_images?.sort((a, b) => a.position - b.position)[0]?.url ?? null,
    allergens: p.allergens ?? null,
  }));
}

export async function getProductByHandle(
  handle: string,
): Promise<ProductWithRelations | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("handle", handle)
    .maybeSingle();
  return (data as unknown as ProductWithRelations | null) ?? null;
}
