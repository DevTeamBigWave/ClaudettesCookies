import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { getActiveProducts } from "@/lib/data/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop",
  description: "Every Claudette's box — four flavors, zero compromise.",
};

export default async function ShopPage() {
  const products = await getActiveProducts();

  return (
    <div className="container py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold">The Boxes</h1>
        <p className="mt-3 text-muted-foreground">
          Every box is four cookies, baked to order. Mix your ritual.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
