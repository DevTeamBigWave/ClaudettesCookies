import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Lazily-constructed server-side Stripe client. Building the client requires a
 * secret key, which isn't present (and isn't needed) during `next build` — so
 * we defer construction until first use at runtime. Call sites use `stripe.x`
 * unchanged; the Proxy forwards to the real instance on first access.
 */
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      appInfo: { name: "Claudette's Cookies", version: "0.1.0" },
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe(), prop, getStripe());
  },
});
