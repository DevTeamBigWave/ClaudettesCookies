/**
 * Clean Label — the per-cookie ingredient breakdown shown on /clean-label.
 * Organic ingredients are prefixed with `*` (rendered as a ★). This is static
 * brand content; if it ever needs to be editable from the admin, move it into a
 * table and read it the same way the storefront reads products.
 */
export type CleanLabelCookie = {
  name: string;
  gf?: boolean;
  subtitle: string;
  /** Ingredient list; organic items prefixed with `*`. */
  ingredients: string;
};

export const CLEAN_LABEL: CleanLabelCookie[] = [
  {
    name: "The Disco Biscuit",
    gf: true,
    subtitle: 'The "OG" Granola Energy Cookie',
    ingredients:
      "*Bananas, *Gluten-Free Rolled Oats, *Sprouted Walnuts, *Shredded Coconut, Enjoy Life Chocolate, Primal Kitchen Avocado Oil, Aluminum-Free Baking Powder, Maldon Sea Salt.",
  },
  {
    name: "The After School Special",
    gf: true,
    subtitle: "The Flourless PB&J",
    ingredients:
      "Homemade Peanut Butter (*Peanuts, Maldon Sea Salt), *Pasture-Raised Eggs, *Cane Sugar, Real Fruit Jam (Raspberries, Cane Sugar, Pectin).",
  },
  {
    name: "The Sicilian",
    subtitle: "White Chocolate & Pistachio",
    ingredients:
      "*King Arthur Unbleached Flour, *Grass-Fed Butter, *Brown Sugar, *Cane Sugar, *Pasture-Raised Eggs, Real White Chocolate, *Sprouted Pistachios, Real Vanilla Bean, Aluminum-Free Baking Powder, Maldon Sea Salt.",
  },
  {
    name: "The Sunday Morning",
    subtitle: "Chocolate Chip Walnut",
    ingredients:
      "*King Arthur Unbleached Flour, *Grass-Fed Butter, *Brown Sugar, *Cane Sugar, Hu Kitchen Chocolate, *Sprouted Walnuts, *Cornstarch, *Pasture-Raised Eggs, Real Vanilla Bean, Aluminum-Free Baking Powder, Baking Soda, Maldon Sea Salt.",
  },
];
