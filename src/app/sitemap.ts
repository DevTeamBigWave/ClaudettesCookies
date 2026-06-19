import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/products";
import { getPublishedPosts } from "@/lib/data/posts";
import { COLLECTIONS } from "@/lib/data/collections";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.claudettescookies.shop";

  // Coerce a DB timestamp into a valid Date; drop it rather than emit a bad
  // <lastmod> that crawlers ignore.
  const lastmod = (v: string | null | undefined): Date | undefined => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const staticRoutes = [
    "",
    "/shop",
    "/gift-cards",
    "/blog",
    "/about",
    "/clean-label",
    ...COLLECTIONS.map((c) => `/collections/${c.slug}`),
  ].map((path) => ({
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
      lastModified: lastmod(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: lastmod(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
