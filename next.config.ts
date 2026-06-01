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
};

export default nextConfig;
