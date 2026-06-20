import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Real product imagery currently lives on Shopify's CDN. Once assets are
      // migrated to Supabase Storage, add that host and drop this one.
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    // Keep server actions tight; storefront mutations go through route handlers.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    // Keep funnel pages out of the index. robots.txt already disallows them, but
    // an X-Robots-Tag header guarantees noindex even if a URL gets crawled
    // directly — and works on the "use client" cart/checkout pages that can't
    // export Next metadata. Covers /cart, /checkout, and /checkout/success.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, follow" }];
    return [
      { source: "/cart", headers: noindex },
      { source: "/checkout", headers: noindex },
      { source: "/checkout/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
