/**
 * Credibility band — social proof built entirely on true brand facts (see
 * /about): a family operation that ran five Queens kitchens from 2012–2026 and
 * fed millions in Rockaway Park, now shipping nationwide. Real proof for cold
 * ad traffic that's never heard of the brand, with zero fabricated claims.
 */
const STATS: { value: string; label: string }[] = [
  { value: "Since 2012", label: "Feeding our neighborhood" },
  { value: "5 NYC kitchens", label: "Queens & Rockaway Park" },
  { value: "Millions fed", label: "And counting, nationwide" },
  { value: "Baked to order", label: "Never sits on a shelf" },
];

export function CredibilityBand({ className = "" }: { className?: string }) {
  return (
    <section className={`border-y border-border bg-[hsl(var(--maroon))] text-white ${className}`}>
      <div className="container grid grid-cols-2 gap-6 py-10 text-center md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.value}>
            <p className="font-display text-2xl font-semibold leading-tight">{s.value}</p>
            <p className="mt-1 text-sm text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
