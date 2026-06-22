import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { priceCart, qualifiesForFreeShipping, type PricedLine } from "@/lib/pricing";
import { resolveRate, type CheckoutRate } from "@/lib/live-shipping";
import { resolveDiscount } from "@/lib/discounts";
import { BUILD_YOUR_OWN_HANDLE, BOX_SIZE } from "@/lib/data/products";

export const runtime = "nodejs";

// The installed Stripe Node types (acacia) predate Custom Checkout's `ui_mode:
// "custom"`. It's a valid request param, so we extend the typed create params
// here rather than upgrade the SDK.
type CustomCheckoutCreateParams = Omit<Stripe.Checkout.SessionCreateParams, "ui_mode"> & {
  ui_mode: "custom";
};

const Body = z.object({
  // Email/phone arrive from our form (the customer types them before the Stripe
  // elements mount) or via the Checkout SDK; optional at create time, the webhook
  // reconciles the real values.
  email: z.string().email().optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  // When true, local pickup: no shipping address, no carrier, free.
  pickup: z.boolean().optional(),
  // Shipping destination, collected in our own form so we can quote live USPS
  // rates before payment. Required for ship orders (not pickup).
  address: z
    .object({
      name: z.string().trim().optional(),
      line1: z.string().trim().min(1),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(1),
      state: z.string().trim().length(2),
      postalCode: z.string().trim().min(3).max(10),
    })
    .optional(),
  // The live rate the customer picked (CheckoutRate.id). The server re-quotes and
  // matches this so the billed amount can't be tampered with; cheapest if absent.
  rateId: z.string().trim().max(80).optional(),
  discountCode: z.string().trim().min(1).max(40).optional(),
  // First-party attribution captured in the browser (utm tags + referrer host).
  attribution: z
    .object({
      utmSource: z.string().trim().max(120).optional(),
      utmMedium: z.string().trim().max(120).optional(),
      utmCampaign: z.string().trim().max(160).optional(),
      referrerHost: z.string().trim().max(255).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        // Build-Your-Own box: the chosen flavors. Validated server-side below.
        composition: z
          .array(z.object({ handle: z.string().min(1), qty: z.number().int().min(1).max(BOX_SIZE) }))
          .optional(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, phone, items, discountCode, pickup, address, rateId, attribution } = parsed.data;
  if (!pickup && !address) {
    return NextResponse.json({ error: "A shipping address is required." }, { status: 400 });
  }
  // Placeholder until the customer's real email arrives (wallet or SDK) and the
  // webhook reconciles it. orders.email is NOT NULL, so we always set something.
  const orderEmail = email || "pending@orders.claudettescookies.shop";
  const db = createAdminClient();

  // 1) Load variants from the DB and re-price every line server-side.
  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error } = await db
    .from("product_variants")
    .select("id, title, price_cents, product_id, products(title, handle, product_images(url, position))")
    .in("id", variantIds);

  if (error || !variants) {
    return NextResponse.json({ error: "Could not load cart" }, { status: 500 });
  }

  // Valid Build-Your-Own flavors (handle → short name), if any custom box is present.
  const needsFlavors = items.some((i) => i.composition?.length);
  const flavorNames = new Map<string, string>();
  if (needsFlavors) {
    const { data: flavors } = await db
      .from("products")
      .select("handle, title")
      .eq("status", "active")
      .eq("is_flavor", true);
    for (const f of flavors ?? []) {
      flavorNames.set(f.handle as string, (f.title as string).split("—")[0].trim());
    }
  }

  const priced: PricedLine[] = [];
  for (const item of items) {
    const v = variants.find((x) => x.id === item.variantId) as
      | (typeof variants)[number]
      | undefined;
    if (!v) return NextResponse.json({ error: "An item is no longer available" }, { status: 409 });
    const product = v.products as unknown as {
      title: string;
      handle: string;
      product_images: { url: string; position: number }[];
    };
    const image =
      product?.product_images?.sort((a, b) => a.position - b.position)[0]?.url ?? null;

    // Build-Your-Own: require a valid 6-cookie composition. A box that's
    // entirely one flavor is named after that flavor (e.g. "The Sicilian
    // Stash"), not the generic "Build Your Own Box"; a real mix keeps the
    // builder title and an itemized content line. (Price is the flat box price
    // from the DB regardless.)
    let title = product?.title ?? "Cookie box";
    let variantTitle = v.title;
    if (product?.handle === BUILD_YOUR_OWN_HANDLE || item.composition?.length) {
      const picks = item.composition ?? [];
      const cookieCount = picks.reduce((n, p) => n + p.qty, 0);
      if (cookieCount !== BOX_SIZE) {
        return NextResponse.json(
          { error: `Build Your Own boxes need exactly ${BOX_SIZE} cookies.` },
          { status: 422 },
        );
      }
      const bad = picks.find((p) => !flavorNames.has(p.handle));
      if (bad) {
        return NextResponse.json({ error: "That flavor is no longer available." }, { status: 409 });
      }
      if (picks.length === 1) {
        title = flavorNames.get(picks[0].handle) ?? title;
        variantTitle = `${BOX_SIZE} cookies`;
      } else {
        variantTitle = picks.map((p) => `${p.qty}× ${flavorNames.get(p.handle)}`).join(", ");
      }
    }

    priced.push({
      variantId: v.id,
      productId: v.product_id,
      title,
      variantTitle,
      imageUrl: image,
      unitPriceCents: v.price_cents,
      quantity: item.quantity,
      totalCents: v.price_cents * item.quantity,
    });
  }

  // 2) Validate the discount code (if any). Shared with the promo-preview route
  //    so the quoted discount and the charged discount always agree (active,
  //    min-subtotal, and once-per-customer are all enforced in resolveDiscount).
  const subtotal = priced.reduce((s, l) => s + l.totalCents, 0);
  const resolved = await resolveDiscount(db, discountCode, subtotal, email);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 422 });
  }
  const discount = resolved.discount;

  // Resolve shipping server-side. For ship orders, re-quote the live rate the
  // customer selected (so the billed amount can't be tampered with); pickup is
  // free. Free-shipping perks (threshold or a free_shipping discount) zero it out
  // inside priceCart regardless of the quoted amount.
  let shippingRate: CheckoutRate | null = null;
  if (!pickup && address) {
    shippingRate = await resolveRate(
      db,
      {
        name: address.name,
        phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      },
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      rateId,
    );
  }
  const cart = priceCart(priced, discount, pickup ? 0 : shippingRate?.amountCents);
  const freeShipping = qualifiesForFreeShipping(cart.subtotalCents, cart.discountCents, discount);

  // The shipping address/contact we collected, stored on the order up front (the
  // address-first flow doesn't use Stripe's address collection, so the webhook
  // won't overwrite this). Shape matches what the admin/label code reads.
  const shippingAddress =
    !pickup && address
      ? {
          name: address.name ?? null,
          phone: phone ?? null,
          address: {
            line1: address.line1,
            line2: address.line2 ?? null,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
            country: "US",
          },
        }
      : { name: null, phone: phone ?? null, address: null };
  const shippingMethod = pickup
    ? "Local pickup"
    : freeShipping
      ? "Free shipping"
      : `${shippingRate?.carrier ?? "USPS"} · ${shippingRate?.service ?? "Shipping"}`;

  // 3) Upsert the customer when we already know the email; otherwise the webhook
  //    links/creates the customer from the wallet/SDK email after payment.
  const customer = email
    ? (await db.from("customers").upsert({ email }, { onConflict: "email" }).select("id").single()).data
    : null;

  // 4) Create the pending order + items.
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      customer_id: customer?.id ?? null,
      email: orderEmail,
      status: "pending",
      subtotal_cents: cart.subtotalCents,
      discount_cents: cart.discountCents,
      shipping_cents: cart.shippingCents,
      tax_cents: cart.taxCents,
      total_cents: cart.totalCents,
      discount_id: discount?.id ?? null,
      discount_code: discount?.code ?? null,
      shipping_method: shippingMethod,
      shipping_carrier: pickup ? "Pickup" : freeShipping ? "Flat" : (shippingRate?.carrier ?? "USPS"),
      shipping_service: pickup ? "PICKUP" : (shippingRate?.id ?? "FLAT"),
      shipping_address: shippingAddress,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }

  // Flag pickup with a separate, tolerant update so a not-yet-migrated
  // fulfillment_type column can't break order creation (ship is the DB default).
  if (pickup) {
    const { error: pickupErr } = await db
      .from("orders")
      .update({ fulfillment_type: "pickup" })
      .eq("id", order.id);
    if (pickupErr) console.error("Could not set fulfillment_type (run migration 0013):", pickupErr.message);
  }

  // Stamp attribution with a separate, tolerant update so a not-yet-migrated
  // analytics column (migration 0014) can never break order creation.
  if (attribution && (attribution.utmSource || attribution.referrerHost)) {
    const { error: attribErr } = await db
      .from("orders")
      .update({
        utm_source: attribution.utmSource ?? null,
        utm_medium: attribution.utmMedium ?? null,
        utm_campaign: attribution.utmCampaign ?? null,
        referrer_host: attribution.referrerHost ?? null,
      })
      .eq("id", order.id);
    if (attribErr) console.error("Could not set attribution (run migration 0014):", attribErr.message);
  }

  await db.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      variant_id: l.variantId,
      title: l.title,
      variant_title: l.variantTitle,
      image_url: l.imageUrl,
      unit_price_cents: l.unitPriceCents,
      quantity: l.quantity,
      total_cents: l.totalCents,
    })),
  );

  // 5) Create the Stripe Checkout Session. We send our own re-priced amounts;
  //    discounts are folded in as a negative-free line via Stripe coupons would
  //    be cleaner, but for the MVP we apply the discount to unit amounts via a
  //    single adjustment line to keep totals exact.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: "usd",
      unit_amount: l.unitPriceCents,
      product_data: { name: `${l.title} — ${l.variantTitle}` },
    },
  }));

  // Shipping is collected in our own address form and quoted live before the
  // session is created, so we bake the chosen rate in as a line item instead of
  // using Stripe's shipping_options (which would require Stripe to collect the
  // address again, and can't reflect a per-address live rate set up front). The
  // discount coupon below applies to the whole total, so amounts stay exact.
  if (cart.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cart.shippingCents,
        product_data: { name: shippingMethod },
      },
    });
  }

  let session: Stripe.Checkout.Session;
  try {
    const params: CustomCheckoutCreateParams = {
      mode: "payment",
      ui_mode: "custom",
      // Only set when known up front; otherwise the SDK provides it.
      ...(email ? { customer_email: email } : {}),
      line_items: lineItems,
      // Collect a phone number (the carrier requires a recipient phone). The
      // manual flow also sets it via the SDK (updatePhoneNumber) as a fallback.
      phone_number_collection: { enabled: true },
      // Apply discount as a Stripe coupon so the displayed total matches our math.
      discounts:
        cart.discountCents > 0 ? [{ coupon: await ensureCoupon(cart.discountCents) }] : undefined,
      // phone (when known at create) is reconciled by the webhook as a fallback.
      metadata: { order_id: order.id, free_shipping: freeShipping ? "1" : "0", ...(phone ? { phone } : {}) },
      payment_intent_data: { metadata: { order_id: order.id } },
    };
    session = await stripe.checkout.sessions.create(
      params as unknown as Stripe.Checkout.SessionCreateParams,
    );
  } catch (e) {
    // Surface the real Stripe error instead of a bare 500 (which the browser
    // would mask as an opaque JSON-parse failure).
    console.error("Checkout session create failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start payment" },
      { status: 502 },
    );
  }

  await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

  return NextResponse.json({
    clientSecret: session.client_secret,
    orderNumber: order.order_number,
    // Threaded into the success-page return URL so the conversion can be fired
    // from the server-verified Stripe session (custom checkout has no success_url).
    sessionId: session.id,
    // Server-computed breakdown so the payment step + confirmation can show the
    // discount the customer is actually charged (not a client-side guess).
    breakdown: {
      subtotalCents: cart.subtotalCents,
      discountCents: cart.discountCents,
      shippingCents: cart.shippingCents,
      totalCents: cart.totalCents,
    },
  });
}

// Stripe needs a coupon object to apply a fixed amount off. We create an
// ephemeral once-redeemable coupon for the exact computed discount.
async function ensureCoupon(amountOffCents: number): Promise<string> {
  const coupon = await stripe.coupons.create({
    amount_off: amountOffCents,
    currency: "usd",
    duration: "once",
    max_redemptions: 1,
    name: "Order discount",
  });
  return coupon.id;
}
