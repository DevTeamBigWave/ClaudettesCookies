import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@/components/analytics/analytics";
import { SiteAnalytics } from "@/components/analytics/site-analytics";

// Mabry — neo-grotesque body face (brand primary text).
const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/mabry-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/mabry-italic.woff2", weight: "400", style: "italic" },
  ],
});

// GT Alpina — editorial serif for headlines.
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/GT-Alpina-Standard-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GT-Alpina-Standard-Regular-Italic.woff2", weight: "400", style: "italic" },
  ],
});

// Central Avenue Bold — deco display accent for big brand moments.
const deco = localFont({
  variable: "--font-deco",
  display: "swap",
  src: [{ path: "./fonts/central-avenue-bold.woff2", weight: "700", style: "normal" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.claudettescookies.shop"),
  title: {
    default: "Claudette's Cookies — No Seed Oils. Just Butter.",
    template: "%s · Claudette's Cookies",
  },
  description:
    "Moroccan-inspired flavors meet healthy eats. Baked with grass-fed butter, organic flour, and zero compromises — the way cookies were made before the industrial revolution.",
  openGraph: {
    type: "website",
    siteName: "Claudette's Cookies",
    title: "Claudette's Cookies — No Seed Oils. Just Butter.",
    description: "Moroccan-inspired flavors meet healthy eats. Everybody eats.",
    images: [{ url: "/brand/og-default.jpg", width: 1200, height: 630, alt: "Claudette's Cookies" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claudette's Cookies — No Seed Oils. Just Butter.",
    description: "Moroccan-inspired flavors meet healthy eats. Everybody eats.",
    images: ["/brand/og-default.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${deco.variable}`}>
      <body>{children}</body>
      <Analytics />
      <SiteAnalytics />
    </html>
  );
}
