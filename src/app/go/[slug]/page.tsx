import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FUNNELS, getFunnel } from "@/config/funnels";
import { getActiveProducts } from "@/lib/data/products";
import { Quiz, type CatalogItem } from "@/components/funnel/quiz";

export const revalidate = 300; // ISR: refresh catalog every 5 min

export function generateStaticParams() {
  return Object.keys(FUNNELS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const funnel = getFunnel(slug);
  if (!funnel) return {};
  return {
    title: funnel.title,
    description: funnel.description,
    alternates: { canonical: `/go/${slug}` },
  };
}

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const funnel = getFunnel(slug);
  if (!funnel) notFound();

  // Build a lightweight catalog map for the reveal. Degrade gracefully (empty
  // map → quiz still works, reveal just shows name + link) if the DB hiccups.
  const catalog: Record<string, CatalogItem> = {};
  try {
    const products = await getActiveProducts();
    for (const p of products) {
      catalog[p.handle] = {
        handle: p.handle,
        title: p.title.split("—")[0].trim(),
        fullTitle: p.title,
        priceCents: p.price_cents,
        image: p.product_images?.sort((a, b) => a.position - b.position)[0]?.url ?? null,
        subtitle: p.subtitle ?? null,
      };
    }
  } catch (e) {
    console.error("Funnel catalog load failed; rendering without product details:", e);
  }

  return <Quiz slug={slug} catalog={catalog} />;
}
