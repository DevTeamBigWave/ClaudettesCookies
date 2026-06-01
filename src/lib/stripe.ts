import Stripe from "stripe";
import { env } from "@/lib/env";

/** Server-side Stripe client. Pin the API version for predictable behavior. */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  appInfo: { name: "Claudette's Cookies", version: "0.1.0" },
  typescript: true,
});
