import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaqSection } from "@/components/shop/faq-section";
import { CLEAN_LABEL } from "@/lib/data/clean-label";

export const metadata: Metadata = {
  title: "The Clean Label",
  description:
    "Every ingredient in every Claudette's cookie, in plain sight. Certified-organic ingredients starred. No seed oils, no mystery chemistry.",
  alternates: { canonical: "/clean-label" },
};

const FAQ = [
  {
    question: "Do you use seed oils?",
    answer:
      "Never. We bake with grass-fed butter — no canola, soybean, or other industrial seed oils.",
  },
  {
    question: "What does the ★ mean?",
    answer: "A ★ marks a certified-organic ingredient. We star every one so you can see exactly what's organic.",
  },
  {
    question: "Are any of your cookies gluten-free?",
    answer:
      "Yes — two flavors are naturally gluten-free: the Disco Drop (oats and bananas) and the Lunchbox, our flourless PB&J. Neither uses wheat flour.",
  },
  {
    question: "Do you use preservatives or 'natural flavors'?",
    answer:
      "No. No gums, no preservatives, no mystery natural flavors — just real ingredients you can pronounce.",
  },
];

/** Renders an ingredient string, turning each `*` into a starred organic mark. */
function Ingredients({ raw }: { raw: string }) {
  const parts = raw.split("*");
  return (
    <p className="text-[hsl(var(--brown))]">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="font-semibold text-primary">★</span>}
          {part}
        </Fragment>
      ))}
    </p>
  );
}

export default function CleanLabelPage() {
  return (
    <div className="container max-w-3xl py-14">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-[hsl(var(--maroon))] md:text-5xl">
          The Clean Label
        </h1>
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-primary">★</span> = Certified Organic Ingredient
          </p>
          <p>
            <span className="font-semibold">gf</span> = Gluten-Free Ingredient
          </p>
        </div>
      </header>

      <div className="mt-10 space-y-5">
        {CLEAN_LABEL.map((cookie) => (
          <article
            key={cookie.name}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-7"
          >
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-[hsl(var(--pink))] md:text-2xl">
              {cookie.name}
              {cookie.gf && " (GF)"}
            </h2>
            <p className="mt-1 italic text-muted-foreground">{cookie.subtitle}</p>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--pink))]">
              The Ingredients:
            </p>
            <div className="mt-2 leading-relaxed">
              <Ingredients raw={cookie.ingredients} />
            </div>
          </article>
        ))}
      </div>

      <FaqSection items={FAQ} className="mt-16" />

      <div className="mt-8 text-center">
        <Button asChild size="lg">
          <Link href="/shop">Shop the cleanest cookie</Link>
        </Button>
      </div>
    </div>
  );
}
