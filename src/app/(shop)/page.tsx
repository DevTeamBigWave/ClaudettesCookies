import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";
import { getActiveProducts, getFeaturedProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const revalidate = 300; // ISR: refresh catalog every 5 min

export default async function HomePage() {
  const [featured, all] = await Promise.all([
    getFeaturedProducts(3),
    getActiveProducts(),
  ]);
  const hero = featured[0] ?? all[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Small-batch · NYC
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
              Four flavors.
              <br />
              Zero compromise.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              We took the chemistry out of cookies and put back the ingredients your
              grandmother would recognize. Baked fresh, shipped to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/shop">Shop the boxes</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">Our story</Link>
              </Button>
            </div>
          </div>

          {hero && (
            <Link
              href={`/products/${hero.handle}`}
              className="relative aspect-square w-full overflow-hidden rounded-3xl bg-secondary shadow-xl"
            >
              {hero.product_images?.[0] && (
                <Image
                  src={hero.product_images[0].url}
                  alt={hero.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              )}
              <div className="absolute bottom-4 left-4 rounded-full bg-background/90 px-4 py-2 text-sm font-semibold shadow">
                {hero.title} · {formatMoney(hero.price_cents)}
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container grid gap-6 py-10 text-center sm:grid-cols-3">
          {[
            ["Clean ingredients", "Names you can pronounce. Nothing you can't."],
            ["Baked to order", "Small batches, never sitting on a shelf."],
            ["Four to a box", "One ritual at a time, $32 a box."],
          ].map(([title, copy]) => (
            <div key={title}>
              <p className="font-display text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section className="container py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold">The signature boxes</h2>
          <Link href="/shop" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {all.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
