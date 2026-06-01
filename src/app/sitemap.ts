import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/products";
import { getPublishedPosts } from "@/lib/data/posts";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://claudettescookies.shop";

  const staticRoutes = ["", "/shop", "/gift-cards", "/blog", "/about"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  // Best-effort: a sitemap should never break the build if the DB is briefly down.
  const [products, posts] = await Promise.all([
    getActiveProducts().catch(() => []),
    getPublishedPosts().catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...products.map((p) => ({
      url: `${base}/products/${p.handle}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
