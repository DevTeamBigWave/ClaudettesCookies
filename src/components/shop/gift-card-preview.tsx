import Image from "next/image";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Brand-accurate gift card face, per the 2024 brand guide: a flat maroon ground
 * (no gradients), the Central Avenue wordmark in cream, the Moroccan diamond-tile
 * motif in pink, and the amount in GT Alpina. Reusable across the storefront
 * preview and the gift-card email.
 */
export function GiftCardPreview({
  amount,
  recipientName,
  className,
}: {
  amount: number;
  recipientName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-[hsl(var(--maroon))] text-[#F5F1EB] shadow-xl",
        className,
      )}
    >
      {/* Moroccan diamond-tile motif (brand guide, p.17). */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]">
        <defs>
          <pattern id="cc-gift-tiles" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M23 7 38 23 23 39 8 23Z" fill="hsl(var(--pink))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cc-gift-tiles)" />
      </svg>

      {/* Cream inner frame — echoes the logo clearspace framing. */}
      <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#F5F1EB]/25" />

      <div className="relative flex h-full flex-col justify-between p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="font-deco text-2xl uppercase leading-none tracking-wide sm:text-3xl">
            Claudette&rsquo;s
          </span>
          <Image
            src="/brand/claudettes-badge.png"
            alt=""
            width={44}
            height={44}
            className="size-10 shrink-0 sm:size-11"
          />
        </div>

        <div>
          {recipientName && (
            <p className="mb-1 font-display text-base italic opacity-90">For {recipientName}</p>
          )}
          <p className="font-deco text-xs uppercase tracking-[0.22em] opacity-80">Gift Card</p>
          <p className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {formatMoney(amount)}
          </p>
          <div className="mt-2 flex gap-1.5 text-base text-[hsl(var(--accent))]" aria-hidden>
            <span>◆</span>
            <span>◆</span>
            <span>◆</span>
          </div>
        </div>
      </div>
    </div>
  );
}
