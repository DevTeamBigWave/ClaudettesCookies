import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { getActiveProducts } from "@/lib/data/products";
import { COLLECTIONS } from "@/lib/data/collections";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop",
  description: "Every Claudette's box — six cookies, four flavors, zero compromise.",
};

export default async function ShopPage() {
  const products = await getActiveProducts();

  return (
    <div className="container py-14">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold">The Boxes</h1>
        <p className="mt-3 text-muted-foreground">
          Every box is six cookies, baked to order. Mix your ritual.
        </p>
      </header>

      {/* Collection shortcuts */}
      <nav className="mb-10 flex flex-wrap gap-2">
        {COLLECTIONS.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            {c.title.replace(/,.*$/, "")}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
