import type { Metadata } from "next";
import { GiftCardForm } from "./gift-card-form";

export const metadata: Metadata = {
  title: "Gift Cards",
  description:
    "Send a Claudette's Cookies gift card — delivered by email, redeemable on anything in the shop. Grass-fed butter, organic flour, no seed oils.",
  alternates: { canonical: "/gift-cards" },
  openGraph: {
    title: "Gift Cards · Claudette's Cookies",
    description: "Give the ritual. Email-delivered cookie gift cards, redeemable on anything in the shop.",
  },
};

export default function GiftCardsPage() {
  return <GiftCardForm />;
}
