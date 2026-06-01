import Stripe from "stripe";
import { env } from "@/lib/env";

/** Server-side Stripe client. Pin the API version for predictable behavior. */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  appInfo: { name: "Claudette's Cookies", version: "0.1.0" },
  typescript: true,
});
