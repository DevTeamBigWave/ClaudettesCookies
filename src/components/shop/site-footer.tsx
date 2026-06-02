import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-2xl font-semibold">Claudette&rsquo;s Cookies</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            No seed oils. Just butter. Moroccan-inspired flavors and healthy eats, baked
            with grass-fed butter and organic flour. Everybody eats.
          </p>
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Get 10% off your first box</p>
            <NewsletterForm source="footer" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Shop</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/shop" className="hover:text-primary">All Boxes</Link></li>
            <li><Link href="/clean-label" className="hover:text-primary">Clean Label</Link></li>
            <li><Link href="/gift-cards" className="hover:text-primary">Gift Cards</Link></li>
            <li><Link href="/blog" className="hover:text-primary">Journal</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Company</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-primary">Our Story</Link></li>
            <li><a href="mailto:claudettescookies@gmail.com" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Claudette&rsquo;s Cookies. All rights reserved.</p>
          <p>
            Baked fresh in NYC.
            {/* Discreet staff entry — styled to read as plain fine print. */}
            <Link
              href="/admin"
              aria-label="Admin sign in"
              className="ml-1.5 cursor-default text-muted-foreground/45 no-underline transition-colors hover:text-primary"
            >
              admin
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
