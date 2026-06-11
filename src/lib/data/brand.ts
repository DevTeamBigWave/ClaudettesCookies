import {
  FLAT_SHIPPING_CENTS,
  FLAT_EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from "@/lib/pricing";
import { PICKUP } from "@/lib/pickup";

/** Whole-dollar when even, else 2dp (e.g. 700 → "$7", 4500 → "$45"). */
const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/**
 * Durable, customer-facing brand knowledge for the storefront assistant — the
 * single place the chatbot learns everything beyond the live product catalog
 * (which it reads from the DB). Keep in sync with the About, Clean Label, and
 * Gift Card pages. Shipping numbers are derived from `pricing.ts` so they can't
 * drift from what checkout actually charges.
 */
export const BRAND_KNOWLEDGE = `== ABOUT CLAUDETTE'S COOKIES ==
Founder: Claudette Flatow. For over a decade she taught intimate cooking classes
out of her small Rockaway (Queens, NYC) kitchen. From 2012 to 2026 she grew that
into five restaurant locations across Queens and fed millions of people in
Rockaway Park — spinach-and-feta turkey burgers, all-vegan falafel, soul food,
and real hospitality. The motto: "Everybody Eats!" In 2026 the restaurants
closed to launch Claudette's Cookies — the same hands and the same real
ingredients, now baked to order and shipped nationwide. Flavors are
Moroccan-inspired; the ethos is healthy eats with no compromise. Tagline:
"No seed oils. Just butter."

== THE PROMISE (the Clean Label) ==
- Grass-fed butter and organic King Arthur flour. NEVER seed oils (no canola,
  soybean, or other industrial oils), no gums, no preservatives, and no mystery
  "natural flavors."
- Every ingredient in every cookie is listed in plain sight at /clean-label;
  certified-organic ingredients are marked with a ★.
- "Cookies before chemistry" — the way cookies were made before the industrial
  revolution decided chemistry was cheaper than craft.

== BOXES, SIZE & PRICING ==
- Every box is 6 cookies for $45 — a single flavor, the Intro sampler (all four
  signature flavors), or a Build Your Own mix.
- Baked to order and shipped fresh anywhere in the US via FedEx — or pick up
  locally (see below). Never sitting on a shelf.
- At checkout, choose your shipping speed — Regular (${dollars(FLAT_SHIPPING_CENTS)})
  or Express (${dollars(FLAT_EXPRESS_SHIPPING_CENTS)}) — or select Local pickup (free).
- Shipping is FREE on orders over ${dollars(FREE_SHIPPING_THRESHOLD_CENTS)}.
- You can pay with card, Apple Pay, Google Pay, or Link (one-tap at the top of
  checkout).
- For exact box names and prices, trust the live catalog above; if anything here
  conflicts with it, the catalog wins.

== LOCAL PICKUP ==
Yes — local pickup IS available. At checkout, choose "Pick up" instead of "Ship
it" (it's free, no shipping address needed). Pickup is in Rockaway Park (Queens,
NYC). ${PICKUP.instructions}

== GLUTEN-FREE ==
Two flavors are naturally gluten-free (no wheat flour): the Disco Drop (oats,
bananas, and chocolate) and the Lunchbox, our flourless PB&J. Order a full box of
either, or include them in a Build Your Own.

== GIFT CARDS ==
Available at /gift-cards in $25, $50, $75, and $100 — delivered by email with a
code the recipient redeems at checkout.

== FIRST-ORDER OFFER ==
New subscribers get 10% off their first box with code WELCOME10 — sign up via the
newsletter form in the site footer.

== THE JOURNAL ==
The blog lives at /blog: ingredient deep-dives, flavor stories, and baking notes.

== CONTACT & ORDER HELP ==
For order status, delivery timelines, refunds, or anything not covered here,
point customers to hello@claudettescookies.shop or their account — don't guess at
order-specific details.`;
