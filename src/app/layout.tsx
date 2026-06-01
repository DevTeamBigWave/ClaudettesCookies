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
    default: "Claudette's Cookies — Four Flavors. Zero Compromise.",
    template: "%s · Claudette's Cookies",
  },
  description:
    "Small-batch cookies baked with the ingredients your grandmother would recognize. Four flavors, zero compromise.",
  openGraph: {
    type: "website",
    siteName: "Claudette's Cookies",
    title: "Claudette's Cookies — Four Flavors. Zero Compromise.",
    description:
      "Small-batch cookies baked with the ingredients your grandmother would recognize.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
