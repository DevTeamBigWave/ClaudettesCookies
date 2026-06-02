/**
 * "COOKIES BEFORE CHEMISTRY" brand lockup, rebuilt natively so it stays crisp
 * at any size and recolors instantly. The two O's in COOKIES are little
 * chocolate-chip cookies.
 */

function ChipCookie({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="hsl(var(--pink))" />
      <circle cx="11" cy="12" r="2.3" fill="hsl(var(--maroon))" />
      <circle cx="20.5" cy="11" r="1.8" fill="hsl(var(--maroon))" />
      <circle cx="22" cy="19.5" r="2.1" fill="hsl(var(--maroon))" />
      <circle cx="12.5" cy="21" r="1.7" fill="hsl(var(--maroon))" />
      <circle cx="16.5" cy="16.5" r="1.4" fill="hsl(var(--maroon))" />
    </svg>
  );
}

export function CookiesBeforeChemistry() {
  return (
    <section className="bg-[hsl(var(--maroon))] py-5 md:py-7">
      <h2 className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-4xl md:text-5xl">
        <span className="inline-flex items-center text-[hsl(var(--pink))]">
          C
          <ChipCookie className="mx-[0.015em] size-[0.74em]" />
          <ChipCookie className="mx-[0.015em] size-[0.74em]" />
          KIES
        </span>
        <span className="text-background/95">Before Chemistry</span>
      </h2>
    </section>
  );
}
