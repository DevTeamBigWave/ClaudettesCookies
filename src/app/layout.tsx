import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
