import { Star } from "lucide-react";
import { TESTIMONIALS, averageRating, type Testimonial } from "@/lib/data/testimonials";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < Math.round(rating)
              ? "size-4 fill-primary text-primary"
              : "size-4 text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

/**
 * Customer testimonials. Renders nothing until real quotes are added to
 * src/lib/data/testimonials.ts — so the storefront never displays fabricated
 * reviews. Drop in genuine quotes and the section appears automatically.
 */
export function Testimonials({
  items = TESTIMONIALS,
  heading = "What people are saying",
  className = "",
}: {
  items?: Testimonial[];
  heading?: string;
  className?: string;
}) {
  if (!items.length) return null;
  const avg = averageRating(items);

  return (
    <section className={`border-y border-border bg-secondary/30 ${className}`}>
      <div className="container py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-semibold">{heading}</h2>
          {avg != null && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Stars rating={avg} />
              <span className="text-sm text-muted-foreground">
                {avg.toFixed(1)} from {items.length} review{items.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((t, i) => (
            <figure key={i} className="rounded-2xl border border-border bg-card p-6">
              {typeof t.rating === "number" && <Stars rating={t.rating} />}
              <blockquote className="mt-3 text-foreground/90">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.name}
                {t.location ? (
                  <span className="font-normal text-muted-foreground"> · {t.location}</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
