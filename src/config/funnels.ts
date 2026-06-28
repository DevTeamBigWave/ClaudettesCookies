/**
 * Funnel configuration — drives the gamified `/go/<slug>` quizzes.
 *
 * Isomorphic: pure data + a pure rules function, no server-only imports, so both
 * the server page (metadata / static params) and the client quiz can import it.
 *
 * The quiz BRANCHES: the first answer (segment) selects a different set of
 * follow-up steps. The result is computed live by `computeResult` — rules only,
 * no AI, no network — and maps to a REAL product handle from the catalog.
 */

export interface FunnelOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FunnelStep {
  /** Answer key this step writes into the answers map. */
  key: string;
  question: string;
  options: FunnelOption[];
}

export interface FunnelSegment {
  value: string;
  label: string;
  hint?: string;
  /** Follow-up steps for THIS segment only (the branch). */
  steps: FunnelStep[];
}

export interface FunnelResult {
  /** Real product handle to recommend + link to. */
  productHandle: string;
  headline: string;
  /** One concrete, specific metric/spec — never an invented claim. */
  metric: string;
  blurb: string;
  ctaLabel: string;
}

export interface FunnelConfig {
  slug: string;
  title: string;
  description: string;
  intro: { eyebrow: string; heading: string; sub: string };
  segmentQuestion: string;
  segments: FunnelSegment[];
  computeResult: (answers: Record<string, string>) => FunnelResult;
}

// Real product handles (from the live catalog / seed).
const INTRO = "the-intro";
const SICILIAN = "the-sicilians";
const DISCO = "the-disco-drop-your-morning-fuel-sorted";
const LUNCHBOX = "the-lunchbox-nostalgia-on-repeat";
const SUNDAY = "the-sunday-ritual-the-only-chocolate-chip-you-need";
const BYO = "build-your-own";

const r = (
  productHandle: string,
  headline: string,
  metric: string,
  blurb: string,
  ctaLabel = "Shop your match",
): FunnelResult => ({ productHandle, headline, metric, blurb, ctaLabel });

const findYourBox: FunnelConfig = {
  slug: "find-your-box",
  title: "Find Your Box — Claudette's Cookies",
  description:
    "Answer three quick questions and we'll match you to your perfect box of small-batch, no-seed-oil cookies.",
  intro: {
    eyebrow: "Everybody Eats!",
    heading: "Find your box",
    sub: "Three quick taps and we'll match you to your cookies. No seed oils, just butter.",
  },
  segmentQuestion: "Who are we baking for?",
  segments: [
    {
      value: "myself",
      label: "Just for me",
      hint: "Treat yourself",
      steps: [
        {
          key: "craving",
          question: "What are you craving?",
          options: [
            { value: "chocolate", label: "Chocolate, always" },
            { value: "nutty", label: "Nutty & rich" },
            { value: "fruity", label: "Fruity & nostalgic" },
            { value: "variety", label: "Surprise me" },
          ],
        },
        {
          key: "diet",
          question: "Any dietary needs?",
          options: [
            { value: "gf", label: "Gluten-free, please" },
            { value: "none", label: "No restrictions" },
          ],
        },
      ],
    },
    {
      value: "gift",
      label: "A gift",
      hint: "For someone special",
      steps: [
        {
          key: "occasion",
          question: "What's the occasion?",
          options: [
            { value: "birthday", label: "Birthday" },
            { value: "thanks", label: "Thank-you" },
            { value: "justbecause", label: "Just because" },
            { value: "holiday", label: "Holiday / hostess" },
          ],
        },
        {
          key: "giftDiet",
          question: "Do they need gluten-free?",
          options: [
            { value: "gf", label: "Yes, gluten-free" },
            { value: "unsure", label: "Not sure" },
            { value: "none", label: "No restrictions" },
          ],
        },
      ],
    },
    {
      value: "crowd",
      label: "A crowd",
      hint: "Party, office, event",
      steps: [
        {
          key: "people",
          question: "How many people?",
          options: [
            { value: "small", label: "5–10" },
            { value: "medium", label: "10–20" },
            { value: "large", label: "20+" },
          ],
        },
        {
          key: "spread",
          question: "Flavor spread?",
          options: [
            { value: "variety", label: "A mix of everything" },
            { value: "crowdpleasers", label: "Crowd-pleasers" },
            { value: "gf", label: "Gluten-free friendly" },
          ],
        },
      ],
    },
  ],

  computeResult(a) {
    const { segment, craving, diet, giftDiet, people, spread } = a;

    if (segment === "myself") {
      const gf = diet === "gf";
      if (craving === "chocolate") {
        return gf
          ? r(DISCO, "The Disco Drop", "Chocolate-dipped · gluten-free", "Chocolate-dipped oat & banana cookies — your chocolate fix, naturally gluten-free.")
          : r(SUNDAY, "The Sunday Ritual", "Chocolate-chip walnut · baked to order", "The only chocolate chip you need — brown-butter deep and walnut-rich.");
      }
      if (craving === "nutty") {
        return gf
          ? r(LUNCHBOX, "The Lunchbox", "Flourless PB&J · gluten-free", "Nostalgic peanut-butter-and-jelly — flourless and naturally gluten-free.")
          : r(SICILIAN, "The Sicilian Stash", "Six pistachio cookies", "Pistachio through and through — nutty, rich, a little fancy.");
      }
      if (craving === "fruity") {
        return gf
          ? r(DISCO, "The Disco Drop", "Oat, banana & chocolate · gluten-free", "Banana-sweet and chocolate-dipped — naturally gluten-free.")
          : r(LUNCHBOX, "The Lunchbox", "Afterschool PB&J", "Peanut butter and jelly, grown up — fruity, nostalgic, a little gooey.");
      }
      // variety / surprise me
      return gf
        ? r(BYO, "Build Your Own Box", "Pick 6 gluten-free flavors", "Mix your own six — load up on the gluten-free Disco Drop and Lunchbox.")
        : r(INTRO, "The Intro", "All four signature flavors", "One box, all four signatures — the best way to meet the lineup.");
    }

    if (segment === "gift") {
      return giftDiet === "gf"
        ? r(DISCO, "The Disco Drop", "Gluten-free & giftable", "A safe, delicious bet for a gluten-free someone — chocolate-dipped oat & banana.")
        : r(INTRO, "The Intro", "All four flavors · a branded box", "Our signature gift: a branded box with all four flavors. Pair it with a gift card if you want them to keep choosing.", "Gift this box");
    }

    // crowd — estimate box count (~1 box of 6 per ~3 people; clearly an estimate)
    const boxesByPeople: Record<string, number> = { small: 2, medium: 4, large: 7 };
    const boxes = boxesByPeople[people] ?? 3;
    const cookies = boxes * 6;
    const metric = `≈ ${boxes} boxes · ${cookies} cookies`;
    if (spread === "gf") {
      return r(BYO, "Build Your Own Boxes", metric, "Build gluten-free-friendly boxes for the group — load up on the Disco Drop and Lunchbox.", "Build your boxes");
    }
    if (spread === "crowdpleasers") {
      return r(SUNDAY, "The Sunday Ritual", metric, "Chocolate-chip walnut never misses with a crowd — grab a few boxes.", "Shop the crowd-pleaser");
    }
    return r(INTRO, "The Intro", metric, "Variety for everyone — a few Intro boxes cover all four flavors.", "Shop the variety box");
  },
};

export const FUNNELS: Record<string, FunnelConfig> = {
  [findYourBox.slug]: findYourBox,
};

export function getFunnel(slug: string): FunnelConfig | null {
  return FUNNELS[slug] ?? null;
}
