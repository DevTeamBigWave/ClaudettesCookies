import Link from "next/link";
import Image from "next/image";

/**
 * Distraction-light shell for funnel landing pages (/go/<slug>): just the brand
 * mark, no nav/footer/chat, so the quiz keeps the visitor focused. Inherits the
 * root layout (fonts + analytics).
 */
export default function GoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="flex items-center justify-center py-5">
        <Link href="/" className="flex items-center gap-2" aria-label="Claudette's Cookies home">
          <Image
            src="/brand/claudettes-badge.png"
            alt=""
            width={36}
            height={36}
            className="rounded-full"
          />
          <span className="font-display text-lg font-semibold text-[hsl(var(--maroon))]">
            Claudette&rsquo;s
          </span>
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
