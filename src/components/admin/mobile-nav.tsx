"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_LINKS, isActiveLink } from "./nav-links";

/**
 * Mobile-only admin navigation: a hamburger button that opens a slide-in
 * drawer. The desktop sidebar is hidden below `md`, so without this there's no
 * way to move between admin sections on a phone.
 */
export function MobileAdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation so tapping a link dismisses the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex size-9 items-center justify-center rounded-lg text-foreground/70 hover:bg-secondary"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[82vw] flex-col border-r border-border bg-card transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-display text-lg font-semibold">Claudette&rsquo;s</p>
            <p className="text-xs text-muted-foreground">Store Admin</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex size-9 items-center justify-center rounded-lg text-foreground/70 hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                isActiveLink(href, pathname)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            <ExternalLink className="size-4" /> View store
          </Link>
        </div>
      </aside>
    </div>
  );
}
