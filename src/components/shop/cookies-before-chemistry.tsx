/**
 * "COOKIES BEFORE CHEMISTRY" brand lockup, rebuilt natively so it stays crisp
 * at any size and recolors instantly. The two O's in COOKIES are little
 * chocolate-chip cookies, each with a bite taken out — matching the brand mark.
 */

function ChipCookie({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        {/* Bite out of the upper-right edge (transparent so the band shows through). */}
        <mask id={id}>
          <rect width="32" height="32" fill="white" />
          <circle cx="27.5" cy="6" r="4.6" fill="black" />
          <circle cx="30.5" cy="10.5" r="2.6" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <circle cx="16" cy="16" r="15" fill="hsl(var(--pink))" />
        {/* chocolate chips */}
        <circle cx="10.5" cy="13" r="2" fill="hsl(var(--maroon))" />
        <circle cx="19" cy="10.5" r="1.5" fill="hsl(var(--maroon))" />
        <circle cx="22" cy="19" r="2" fill="hsl(var(--maroon))" />
        <circle cx="12" cy="21.5" r="1.7" fill="hsl(var(--maroon))" />
        <circle cx="16.5" cy="16.5" r="1.4" fill="hsl(var(--maroon))" />
        <circle cx="24" cy="13.5" r="1.1" fill="hsl(var(--maroon))" />
      </g>
    </svg>
  );
}

export function CookiesBeforeChemistry() {
  return (
    <section className="bg-[hsl(var(--maroon))] py-5 md:py-7">
      <h2 className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-display uppercase leading-none text-[hsl(var(--pink))]">
        <span className="inline-flex items-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          C
          <ChipCookie id="cbc-o1" className="mx-[0.015em] size-[0.74em]" />
          <ChipCookie id="cbc-o2" className="mx-[0.015em] size-[0.74em]" />
          KIES
        </span>
        <span className="text-2xl font-light tracking-[0.14em] text-background/95 sm:text-3xl md:text-4xl">
          Before Chemistry
        </span>
      </h2>
    </section>
  );
}
