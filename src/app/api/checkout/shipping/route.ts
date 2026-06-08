import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { shippingTiersForZip } from "@/lib/shipping";

export const runtime = "nodejs";

/**
 * Called by the embedded checkout (via `checkout.runServerUpdate`) whenever the
 * customer changes their shipping address. We re-quote live FedEx rates for that
 * ZIP, collapse them into Regular/Express tiers, and write them back onto the
 * Checkout Session along with the collected address. Because the session was
 * created with `permissions.update_shipping_details: server_only`, only this
 * server route can do that — so the rate the customer pays is always one we set.
 */
const Body = z.object({
  checkoutSessionId: z.string().min(1),
  shippingDetails: z.object({
    name: z.string().nullish(),
    address: z.object({
      line1: z.string().nullish(),
      line2: z.string().nullish(),
      city: z.string().nullish(),
      state: z.string().nullish(),
      postal_code: z.string().nullish(),
      country: z.string().nullish(),
    }),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { checkoutSessionId, shippingDetails } = parsed.data;
  const addr = shippingDetails.address;

  // Only ship within the US, and we need a ZIP to quote anything.
  if (addr.country && addr.country !== "US") {
    return NextResponse.json({ error: "We currently only ship within the US." }, { status: 422 });
  }
  const zip = (addr.postal_code ?? "").trim();
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    return NextResponse.json({ error: "Enter a valid ZIP to see shipping options." }, { status: 422 });
  }

  // Confirm the session is one of ours and recover the order it belongs to.
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: "Unknown checkout session" }, { status: 404 });
  }
  const freeShipping = session.metadata?.free_shipping === "1";

  const db = createAdminClient();

  // The shipping option shape matches create params; `shipping_options` on the
  // update call is a newer field the pinned Node types don't include, so we
  // extend + cast at the call site (see updateParams below).
  let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[];
  if (freeShipping) {
    shippingOptions = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Free shipping",
          metadata: { tier: "Free shipping", service_type: "FREE", carrier: "Flat" },
        },
      },
    ];
  } else {
    // Server-trusted package weight from the order's own line items.
    const { data: orderItems } = await db
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);
    const items = (orderItems ?? [])
      .filter((i) => i.variant_id)
      .map((i) => ({ variantId: i.variant_id as string, quantity: i.quantity as number }));

    const tiers = await shippingTiersForZip({ db, destZip: zip.slice(0, 5), items });
    if (tiers.length === 0) {
      return NextResponse.json({ error: "We can't ship to that address." }, { status: 422 });
    }
    shippingOptions = tiers.map((t) => ({
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: t.amountCents, currency: "usd" },
        display_name: t.label,
        metadata: { tier: t.tier, service_type: t.serviceType, carrier: t.serviceType.startsWith("FLAT") ? "Flat" : "FedEx" },
        ...(t.transitDays
          ? {
              delivery_estimate: {
                minimum: { unit: "business_day", value: t.transitDays },
                maximum: { unit: "business_day", value: t.transitDays },
              },
            }
          : {}),
      },
    }));
  }

  // Persist the collected address on the session too (only once it's complete),
  // so it rides along to the webhook as the order's shipping address.
  const hasFullAddress = Boolean(addr.line1 && addr.city && addr.state);
  const collected: Stripe.Checkout.SessionUpdateParams.CollectedInformation | undefined = hasFullAddress
    ? {
        shipping_details: {
          name: shippingDetails.name || "Customer",
          address: {
            line1: addr.line1!,
            line2: addr.line2 || undefined,
            city: addr.city!,
            state: addr.state!,
            postal_code: zip,
            country: "US",
          },
        },
      }
    : undefined;

  const updateParams: Stripe.Checkout.SessionUpdateParams & {
    shipping_options?: Stripe.Checkout.SessionCreateParams.ShippingOption[];
  } = {
    shipping_options: shippingOptions,
    ...(collected ? { collected_information: collected } : {}),
  };
  await stripe.checkout.sessions.update(
    checkoutSessionId,
    updateParams as unknown as Stripe.Checkout.SessionUpdateParams,
  );

  return NextResponse.json({ ok: true });
}
