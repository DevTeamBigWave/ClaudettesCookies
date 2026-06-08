import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { env } from "@/lib/env";

/**
 * Browser-side Stripe.js loader, memoized so the script loads once per page.
 * Safe in client components: only the publishable key (a NEXT_PUBLIC_* var) is
 * referenced. Used by the embedded Custom Checkout on /checkout.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
