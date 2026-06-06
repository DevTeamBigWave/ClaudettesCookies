"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_LINKS, isActiveLink } from "./nav-links";

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="border-b border-border px-6 py-5">
        <p className="font-display text-lg font-semibold">Claudette&rsquo;s</p>
        <p className="text-xs text-muted-foreground">Store Admin</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
  );
}
