import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Browser-side Stripe.js loader for the embedded Custom Checkout.
 *
 * We read the publishable key straight from the inlined `process.env`
 * (NEXT_PUBLIC_* are replaced at build time) rather than the validated env
 * module — so if the key is missing the checkout degrades to a clear "payments
 * unavailable" message instead of throwing during env validation and crashing
 * the whole page.
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
