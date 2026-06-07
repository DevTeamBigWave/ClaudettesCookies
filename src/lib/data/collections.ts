import { getActiveProducts } from "./products";
import type { ProductWithRelations } from "@/types/db";

/**
 * National-intent landing pages. Each is a curated view over the catalog with
 * its own copy + FAQ, targeting commercial search ("cookie gift box",
 * "gluten free cookies delivered", "best cookies online"). Products are filtered
 * from the live catalog so the grids never go stale as inventory changes.
 */
export interface CollectionDef {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string[];
  seoTitle: string;
  seoDescription: string;
  match: (p: ProductWithRelations) => boolean;
  faq: { question: string; answer: string }[];
}

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: "cookie-gift-boxes",
    eyebrow: "Send something better",
    title: "Cookie Gift Boxes, Shipped Nationwide",
    intro: [
      "Every Claudette's box is a gift waiting to happen: six bakery-style cookies in our signature box, baked with grass-fed butter and organic flour — never seed oils — and shipped fresh anywhere in the country.",
      "Pick a single-flavor box, send the Intro so they meet all four flavors, or let them choose their own six with a Build Your Own box. Add a note at checkout and we'll make it land.",
    ],
    seoTitle: "Cookie Gift Boxes — Delivered Nationwide",
    seoDescription:
      "Send a box of small-batch cookies anywhere in the US. Grass-fed butter, organic flour, no seed oils — baked to order and shipped fresh. $45 a box.",
    match: () => true,
    faq: [
      {
        question: "Can I ship a cookie gift box to a different address?",
        answer:
          "Yes. We ship nationwide — just enter the recipient's address at checkout. Your box is baked to order and sent fresh.",
      },
      {
        question: "Can I add a gift message?",
        answer: "Absolutely. There's a note field at checkout, and we'll include your message with the box.",
      },
      {
        question: "How much is a cookie gift box?",
        answer: "Every box is $45 for six cookies, whether it's a single flavor, the Intro sampler, or a Build Your Own mix.",
      },
    ],
  },
  {
    slug: "gluten-free-cookies",
    eyebrow: "No gluten, no compromise",
    title: "Gluten-Free Cookies, Delivered",
    intro: [
      "Our Disco Drop is a dense, chewy, naturally gluten-free cookie built on oats and bananas and finished with a dip of chocolate — breakfast that tastes like dessert, with none of the chemistry.",
      "Order a full box of six, or build your own box stacked entirely with Disco Drops. Shipped fresh nationwide.",
    ],
    seoTitle: "Gluten-Free Cookies — Shipped Fresh Nationwide",
    seoDescription:
      "Naturally gluten-free cookies made with oats, bananas, and real chocolate — no seed oils, baked to order, delivered anywhere in the US.",
    match: (p) => (p.allergens ?? []).some((a) => a.toLowerCase().includes("gluten-free")),
    faq: [
      {
        question: "Are these cookies certified gluten-free?",
        answer:
          "Our Disco Drop is made without gluten-containing ingredients. It is baked in a kitchen that also handles wheat, so we describe it as naturally gluten-free rather than certified.",
      },
      {
        question: "Can I get a whole box of just the gluten-free flavor?",
        answer:
          "Yes — order the Disco Drop box for six, or use Build Your Own and select six Disco Drops.",
      },
    ],
  },
  {
    slug: "bestsellers",
    eyebrow: "Crowd favorites",
    title: "Our Bestselling Cookies",
    intro: [
      "Not sure where to start? These are the boxes people come back for — the flavors that blew up on the feed and the sampler that wins over first-timers.",
      "All baked to order with grass-fed butter and organic flour, shipped fresh nationwide.",
    ],
    seoTitle: "Bestselling Cookies — Baked to Order, Shipped Fresh",
    seoDescription:
      "The cookies everyone orders: our most-loved flavors and samplers, made with grass-fed butter and no seed oils, delivered nationwide.",
    match: (p) => p.featured,
    faq: [
      {
        question: "What's your most popular cookie?",
        answer:
          "The Sicilian pistachio and the Sunday Ritual chocolate chip are perennial favorites. The Intro box is the easiest way to try the lineup.",
      },
      {
        question: "How fresh are the cookies when they arrive?",
        answer: "Every box is baked to order and shipped fresh — never sitting on a shelf.",
      },
    ],
  },
];

export function getCollection(slug: string): CollectionDef | null {
  return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

export async function getCollectionProducts(def: CollectionDef): Promise<ProductWithRelations[]> {
  const all = await getActiveProducts();
  return all.filter(def.match);
}
