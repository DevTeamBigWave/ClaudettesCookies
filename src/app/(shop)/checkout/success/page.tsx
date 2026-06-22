import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderConfirmation } from "@/components/shop/order-confirmation";
import { PurchaseConversion } from "@/components/analytics/purchase-conversion";
import { stripe } from "@/lib/stripe";

export const metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: true },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; pickup?: string; session_id?: string }>;
}) {
  const { order, pickup, session_id } = await searchParams;
  const isPickup = pickup === "1";

  // Server-verified conversion: never trust amounts from the URL/client. Retrieve
  // the Stripe Checkout Session and only fire on a genuinely paid order. The
  // payment-intent id is the transaction_id (dedupes Ads + GA4).
  let conversion: { transactionId: string; value: number; email?: string } | null = null;
  if (session_id) {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id);
      if (s.payment_status === "paid" && s.amount_total != null) {
        const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
        conversion = {
          transactionId: piId ?? s.id,
          value: s.amount_total / 100, // Stripe amounts are in cents
          email: s.customer_details?.email ?? undefined,
        };
      }
    } catch (e) {
      console.error("Conversion: could not retrieve Stripe session", e);
    }
  }

  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="mt-6 font-display text-4xl font-semibold">Thank you!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Your order is in and the oven&rsquo;s on. We&rsquo;ve emailed your receipt
        {order ? <> for order <span className="font-semibold">#{order}</span></> : null}.{" "}
        {isPickup
          ? "We'll contact you within 4 hours with pickup details."
          : "You'll get tracking the moment it ships."}
      </p>
      {conversion && (
        <PurchaseConversion
          transactionId={conversion.transactionId}
          value={conversion.value}
          email={conversion.email}
        />
      )}
      <OrderConfirmation />
      <Button asChild className="mt-8">
        <Link href="/shop">Keep shopping</Link>
      </Button>
    </div>
  );
}
