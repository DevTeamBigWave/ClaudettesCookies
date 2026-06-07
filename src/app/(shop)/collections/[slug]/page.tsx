import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqSection } from "@/components/shop/faq-section";
import {
  COLLECTIONS,
  getCollection,
  getCollectionProducts,
} from "@/lib/data/collections";
import { breadcrumbSchema, itemListSchema } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Not found" };
  return {
    title: collection.seoTitle,
    description: collection.seoDescription,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      type: "website",
      title: collection.seoTitle,
      description: collection.seoDescription,
    },
  };
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const products = await getCollectionProducts(collection);

  return (
    <div className="container py-14">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Shop", path: "/shop" },
            { name: collection.title, path: `/collections/${collection.slug}` },
          ]),
          itemListSchema(
            collection.title,
            products.map((p) => p.handle),
          ),
        ]}
      />

      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          {collection.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">
          {collection.title}
        </h1>
        {collection.intro.map((p, i) => (
          <p key={i} className="mt-4 text-muted-foreground">
            {p}
          </p>
        ))}
      </header>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Nothing in this collection right now —{" "}
          <Link href="/shop" className="text-primary hover:underline">
            shop all boxes
          </Link>
          .
        </p>
      )}

      <FaqSection items={collection.faq} className="mx-auto mt-16 max-w-2xl" />
      <div className="mt-8 text-center">
        <Button asChild size="lg">
          <Link href="/shop">Shop all boxes</Link>
        </Button>
      </div>
    </div>
  );
}
