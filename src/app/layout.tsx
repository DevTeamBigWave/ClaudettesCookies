import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Mabry — neo-grotesque body face (brand primary text).
const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/mabry-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/mabry-italic.otf", weight: "400", style: "italic" },
  ],
});

// GT Alpina — editorial serif for headlines.
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/GT-Alpina-Standard-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/GT-Alpina-Standard-Regular-Italic.otf", weight: "400", style: "italic" },
  ],
});

// Central Avenue Bold — deco display accent for big brand moments.
const deco = localFont({
  variable: "--font-deco",
  display: "swap",
  src: [{ path: "./fonts/central-avenue-bold.otf", weight: "700", style: "normal" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://claudettescookies.shop"),
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
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${deco.variable}`}>
      <body>{children}</body>
    </html>
  );
}
