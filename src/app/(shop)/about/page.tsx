import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FaqSection } from "@/components/shop/faq-section";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "From five Queens restaurants feeding millions in Rockaway Park to cookies shipped nationwide — Claudette Flatow's Moroccan-inspired flavors, healthy eats, and no compromise.",
  alternates: { canonical: "/about" },
};

const FAQ = [
  {
    question: "Where do you ship?",
    answer:
      "Nationwide, anywhere in the US. Every box is baked to order and shipped fresh — never sitting on a shelf.",
  },
  {
    question: "What makes Claudette's cookies different?",
    answer:
      "We bake with grass-fed butter and organic flour and never use seed oils, gums, or mystery 'natural flavors.' Every ingredient in every cookie is listed in plain sight on our Clean Label page.",
  },
  {
    question: "Do you have gluten-free cookies?",
    answer:
      "Yes — two flavors are naturally gluten-free: the Disco Drop (oats, bananas, and chocolate) and the Lunchbox, our flourless PB&J. Order a full box of either, or build your own.",
  },
  {
    question: "How big is a box, and what does it cost?",
    answer:
      "Every box is six cookies for $45 — whether it's a single flavor, the Intro sampler, or a Build Your Own mix.",
  },
];

export default function AboutPage() {
  return (
    <div className="container-prose py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        Everybody Eats!
      </p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-[hsl(var(--maroon))]">
        No seed oils. Just butter.
      </h1>
      <p className="mt-4 text-xl text-foreground/80">
        Moroccan-inspired flavors meet healthy eats.
      </p>

      {/* Founder portrait — vertical hero */}
      <figure className="mt-8">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="/lifestyle/claudette.jpeg"
            alt="Claudette Flatow, founder of Claudette's Cookies, holding fresh herbs"
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
            priority
          />
        </div>
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          Claudette Flatow, founder.
        </figcaption>
      </figure>

      <div className="mt-10 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          A family is only as strong as their story — and ours began long before the cookies.
          For over a decade, <strong>Claudette Flatow</strong> taught intimate cooking classes
          out of her small Rockaway kitchen, dreaming of turning what she loved into something
          that could feed a whole neighborhood.
        </p>
        <p>
          It did. From <strong>2012 to 2026</strong>, Claudette grew that dream into{" "}
          <strong>five locations across Queens</strong> and{" "}
          <strong>fed millions of people in Rockaway Park</strong> — spinach-and-feta turkey
          burgers, all-vegan falafel, soul-food conversations, and the kind of hospitality that
          turns first-timers into regulars and strangers into family. Everybody ate.
        </p>
      </div>

      {/* The brand, in the mix */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-md">
          <Image
            src="/lifestyle/branded-box.jpeg"
            alt="Claudette's signature pink cookie box"
            fill
            sizes="(max-width: 768px) 50vw, 360px"
            className="object-cover"
          />
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-md">
          <Image
            src="/lifestyle/cookie-rack.jpeg"
            alt="An assortment of Claudette's cookies cooling on a wire rack"
            fill
            sizes="(max-width: 768px) 50vw, 360px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          In 2026, we closed those doors — not because the story was over, but to chase its
          next chapter: <strong>Claudette&rsquo;s Cookies</strong>. The same hands, the same
          real ingredients, the same refusal to cut corners — now baked into a cookie we can
          ship anywhere in the country.
        </p>
        <p>
          We bake with grass-fed butter, organic flour, and zero compromises — the way cookies
          were made before the industrial revolution decided chemistry was cheaper than craft.
          No seed oils. No gums you can&rsquo;t pronounce. No mystery &ldquo;natural flavors.&rdquo;
          Just real ingredients, Moroccan-inspired warmth, and the kind of cookie you&rsquo;d be
          proud to serve at your own table. Because around here, everybody eats.
        </p>
      </div>

      <p className="mt-6 text-lg leading-relaxed text-foreground/90">
        Want to see exactly what goes in? Every ingredient in every cookie is listed on our{" "}
        <Link href="/clean-label" className="text-primary underline">
          Clean Label
        </Link>
        .
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop the cleanest cookie</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/blog">Read the Journal</Link>
        </Button>
      </div>

      <FaqSection items={FAQ} className="mt-16" />
    </div>
  );
}
