import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.claudettescookies.shop";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Thin, per-visitor pages: keep them out of the index. They're already
        // excluded from the sitemap; this also blocks crawling.
        disallow: ["/admin", "/api", "/cart", "/checkout"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
