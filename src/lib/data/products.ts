import { createClient } from "@/lib/supabase/server";
import type { ProductWithRelations } from "@/types/db";

const SELECT = "*, product_images(*), product_variants(*)";

/** All active products for the storefront, ordered for display. */
export async function getActiveProducts(): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("status", "active")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as unknown as ProductWithRelations[]) ?? [];
}

export async function getFeaturedProducts(limit = 3): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
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
