/**
 * Real customer testimonials shown on the homepage and product pages.
 *
 * IMPORTANT — only add GENuine quotes from real customers (with their
 * permission). The <Testimonials> section renders nothing while this array is
 * empty, so the site never ships fabricated reviews. As reviews come in (e.g.
 * from the post-purchase email), paste them here and the section appears
 * automatically.
 *
 * `rating` (1–5) is optional; when every entry has one, the homepage shows an
 * aggregate star rating.
 */
export interface Testimonial {
  /** The customer quote, verbatim. */
  quote: string;
  /** Attribution — first name + last initial and/or city is plenty. */
  name: string;
  /** Optional location, e.g. "Rockaway Park, NY". */
  location?: string;
  /** Optional star rating 1–5. */
  rating?: number;
}

export const TESTIMONIALS: Testimonial[] = [
  // Example shape (delete this comment and add real ones):
  // { quote: "Best cookie I've had in years.", name: "Sarah M.", location: "Brooklyn, NY", rating: 5 },
];

/** Average rating across testimonials that have one, or null if none do. */
export function averageRating(items: Testimonial[] = TESTIMONIALS): number | null {
  const rated = items.filter((t) => typeof t.rating === "number");
  if (rated.length === 0) return null;
  return rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length;
}
