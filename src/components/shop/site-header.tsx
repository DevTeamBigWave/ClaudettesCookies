"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/clean-label", label: "Clean Label" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "Our Story" },
];

/** A little paper bag with a chocolate-chip cookie tucked inside. */
function CookieBag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* handles */}
      <path d="M8.5 8V6.4a3.5 3.5 0 0 1 7 0V8" />
      {/* bag body */}
      <path d="M4.8 8h14.4l-.85 11.3A2 2 0 0 1 16.36 21H7.64a2 2 0 0 1-1.99-1.7L4.8 8Z" />
      {/* cookie */}
      <circle cx="12" cy="14.2" r="3.1" />
      {/* chocolate chips */}
      <path d="M11 13.1h.01M13.2 13.4h.01M12 15.6h.01" />
    </svg>
  );
}

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-4">
        <button
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-8" /> : <Menu className="size-8" />}
        </button>

        <Link href="/" className="flex items-center gap-2.5" aria-label="Claudette's Cookies — home">
          <Image
            src="/brand/claudettes-badge.png"
            alt="Claudette's Cookies"
            width={56}
            height={56}
            priority
            className="size-14"
          />
          <span className="font-display text-2xl font-semibold tracking-tight text-[hsl(var(--maroon))]">
            Claudette&rsquo;s
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cart"
          className="relative inline-flex items-center gap-2 text-base font-medium"
          aria-label="Cart"
        >
          <CookieBag className="size-8" />
          {mounted && count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile menu */}
      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="container flex flex-col py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-base font-medium text-foreground/80"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
