import { createPublicClient } from "@/lib/supabase/public";
import type { BlogPost } from "@/types/db";

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return data ?? [];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ?? null;
}
