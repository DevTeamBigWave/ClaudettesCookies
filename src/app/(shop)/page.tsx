import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CookiesBeforeChemistry } from "@/components/shop/cookies-before-chemistry";
import { CredibilityBand } from "@/components/shop/credibility-band";
import { Testimonials } from "@/components/shop/testimonials";
import { ProductCard } from "@/components/shop/product-card";
import { getActiveProducts, getFeaturedProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Claudette's Cookies — No Seed Oils. Just Butter.",
  description:
    "Small-batch cookies baked with grass-fed butter, organic flour, and zero seed oils — Moroccan-inspired flavors, baked to order and shipped nationwide. Every box is six cookies for $45.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Claudette's Cookies — No Seed Oils. Just Butter.",
    description:
      "Moroccan-inspired flavors, baked with grass-fed butter and organic flour. Baked to order, shipped nationwide. Everybody eats.",
    // Share image comes from app/opengraph-image.tsx (branded dynamic card).
  },
};

export const revalidate = 300; // ISR: refresh catalog every 5 min

export default async function HomePage() {
  const [featured, all] = await Promise.all([
    getFeaturedProducts(3),
    getActiveProducts(),
  ]);
  const hero = featured[0] ?? all[0];

  return (
    <>
      {/* Brand tagline band */}
      <CookiesBeforeChemistry />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Everybody Eats!
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] text-[hsl(var(--maroon))] md:text-6xl">
              No seed oils.
              <br />
              Just butter.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              We bake with grass-fed butter, organic flour, and zero compromises — the way
              cookies were made before the industrial revolution. Moroccan-inspired flavors,
              shipped to your door.
            </p>
            <p className="mt-3 text-sm font-semibold text-[hsl(var(--maroon))]">
              Every box is six cookies — $45, baked to order.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link href="/shop">Shop the cleanest cookie</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">Our story</Link>
              </Button>
            </div>
          </div>

          {hero && (
            <Link
              href={`/products/${hero.handle}`}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-secondary shadow-xl"
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
                {hero.title} · 6 cookies · {formatMoney(hero.price_cents)}
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container grid gap-6 py-10 text-center sm:grid-cols-3">
          {[
            ["No seed oils", "Grass-fed butter and organic flour. That's it."],
            ["Baked to order", "Small batches, never sitting on a shelf."],
            ["Cookies before chemistry", "Real ingredients you can actually pronounce."],
          ].map(([title, copy]) => (
            <div key={title}>
              <p className="font-display text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quiz funnel — "Find your box" */}
      <section className="container py-12">
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-border bg-secondary/40 p-8 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              30-second quiz
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[hsl(var(--maroon))]">
              Not sure which box? Find your match.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three quick taps and we&rsquo;ll pick your cookies.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/go/find-your-box">Find your box →</Link>
          </Button>
        </div>
      </section>

      {/* Credibility — real heritage, the strongest honest social proof */}
      <CredibilityBand />

      {/* Catalog */}
      <section className="container py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold">The signature boxes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Six cookies a box · $45 · baked to order.</p>
          </div>
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

      {/* Customer testimonials — renders only once real reviews are added */}
      <Testimonials />

      {/* Editorial band */}
      <section className="container pb-16">
        <div className="relative overflow-hidden rounded-3xl">
          <Image
            src="/lifestyle/milk-splash.jpeg"
            alt="A Claudette's cookie dropping into a glass of milk, fresh batch cooling behind"
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          {/* Content drives the height (instead of a fixed aspect ratio), so the
              heading and button never get clipped on narrow phone screens. */}
          <div className="relative flex min-h-[19rem] flex-col justify-center gap-4 p-8 md:min-h-[22rem] md:p-12">
            <h2 className="max-w-md font-display text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
              The way cookies were made before the industrial revolution.
            </h2>
            <div>
              <Button asChild size="lg">
                <Link href="/about">Read our story</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
