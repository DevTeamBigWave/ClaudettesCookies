import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "A family is only as strong as their story. Claudette's began in a small Rockaway kitchen — Moroccan-inspired flavors, healthy eats, and no compromise.",
};

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

      <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-xl">
        <Image
          src="/lifestyle/choc-stack.jpeg"
          alt="A stack of chocolate-dipped Claudette's cookies on a ceramic plate"
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          A family is only as strong as their story — and ours began long before our front
          doors opened. For over a decade, <strong>Claudette Flatow</strong> was teaching
          intimate cooking classes to neighbors out of her small Rockaway kitchen, dreaming
          of the day she could turn her culinary talents into a rewarding venture.
        </p>
        <p>
          That dream is Claudette&rsquo;s Cookies. We bake with grass-fed butter, organic
          flour, and zero compromises — the way cookies were made before the industrial
          revolution decided chemistry was cheaper than craft.
        </p>
        <p>
          No seed oils. No gums you can&rsquo;t pronounce. No mystery &ldquo;natural
          flavors.&rdquo; Just real ingredients, Moroccan-inspired warmth, and the kind of
          cookie you&rsquo;d be proud to serve at your own table. Because around here,
          everybody eats.
        </p>
      </div>

      <div className="mt-10 flex gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Shop the cleanest cookie</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/blog">Read the Journal</Link>
        </Button>
      </div>
    </div>
  );
}
