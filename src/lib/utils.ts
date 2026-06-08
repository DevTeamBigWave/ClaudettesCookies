import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format integer cents as USD. All money in this app is integer cents. */
export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Split a line item's variant title into its individual picks. Build-Your-Own
 * boxes store their composition as a comma-joined string ("2× A, 1× B, …"); this
 * returns one entry per cookie so it can render as a tidy list instead of one
 * long wrapping line. Returns [] when there's nothing to split.
 */
export function boxContentsLines(variantTitle?: string | null): string[] {
  if (!variantTitle) return [];
  return variantTitle
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** URL-safe slug from a title. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Human gift-card code: CLDT-XXXX-XXXX-XXXX (no ambiguous chars). */
export function generateGiftCardCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `CLDT-${group()}-${group()}-${group()}`;
}

export const absoluteUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
