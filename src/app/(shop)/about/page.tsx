import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Why we took the chemistry out of cookies.",
};

export default function AboutPage() {
  return (
    <div className="container-prose py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our Story</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-tight">
        We took the chemistry out of cookies.
      </h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          Claudette&rsquo;s started with a simple frustration: the cookies on the shelf were
          full of things you couldn&rsquo;t pronounce, and the ones worth eating were nowhere
          to be found. So we started baking the cookie we actually remembered — the one
          made with butter, real chocolate, and time.
        </p>
        <p>
          Every box is four cookies, baked to order in small batches. No gums, no mystery
          &ldquo;natural flavors,&rdquo; no shortcuts. Four flavors, zero compromise — that&rsquo;s
          the whole standard.
        </p>
        <p>
          {/* Placeholder: drop in the official founder story + photos from the brand guide. */}
          We&rsquo;re a small team in New York, shipping nationwide, obsessed with the details
          most people skip. Pull up a chair. Meet the family.
        </p>
      </div>

      <div className="mt-10 flex gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop the boxes</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/blog">Read the Journal</Link>
        </Button>
      </div>
    </div>
  );
}
