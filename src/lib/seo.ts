import { env } from "@/lib/env";
import type { BlogPost, ProductWithRelations } from "@/types/db";

const SITE = env.NEXT_PUBLIC_SITE_URL;
const BRAND = "Claudette's Cookies";
const LOGO = `${SITE}/brand/claudettes-badge.png`;

/** Resolve a possibly-relative asset path to an absolute URL for schema. */
function abs(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${SITE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: SITE,
    logo: LOGO,
    description:
      "Small-batch cookies baked with grass-fed butter, organic flour, and no seed oils — shipped nationwide.",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE,
  };
}

export function productSchema(p: ProductWithRelations) {
  const variant = p.product_variants?.[0];
  const image = p.product_images?.sort((a, b) => a.position - b.position)[0];
  const inStock = (p.product_variants ?? []).some((v) => v.inventory_qty > 0);
  const price = ((variant?.price_cents ?? p.price_cents) / 100).toFixed(2);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.seo_description ?? p.description ?? p.subtitle ?? undefined,
    image: image ? [abs(image.url)] : undefined,
    brand: { "@type": "Brand", name: BRAND },
    category: "Cookies",
    ...(variant?.sku ? { sku: variant.sku } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE}/products/${p.handle}`,
      priceCurrency: p.currency ?? "USD",
      price,
      availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`,
      seller: { "@type": "Organization", name: BRAND },
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function articleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    image: post.cover_image_url ? [abs(post.cover_image_url)] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      logo: { "@type": "ImageObject", url: LOGO },
    },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}
