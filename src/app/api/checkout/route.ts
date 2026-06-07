import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { isDiscountValid, priceCart, type PricedLine } from "@/lib/pricing";
import { BUILD_YOUR_OWN_HANDLE, BOX_SIZE } from "@/lib/data/products";
import type { Discount } from "@/types/db";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  discountCode: z.string().trim().min(1).max(40).optional(),
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
  const { email, items, discountCode } = parsed.data;
  const db = createAdminClient();

  // 1) Load variants from the DB and re-price every line server-side.
  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error } = await db
    .from("product_variants")
    .select("id, title, price_cents, inventory_qty, product_id, products(title, handle, product_images(url, position))")
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
    if (v.inventory_qty < item.quantity) {
      const product = v.products as unknown as { title: string };
      return NextResponse.json(
        { error: `Only ${v.inventory_qty} of ${product?.title ?? "an item"} left` },
        { status: 409 },
      );
    }
    const product = v.products as unknown as {
      title: string;
      handle: string;
      product_images: { url: string; position: number }[];
    };
    const image =
      product?.product_images?.sort((a, b) => a.position - b.position)[0]?.url ?? null;

    // Build-Your-Own: require a valid 6-cookie composition and use it as the
    // line's display title (price stays the box price — flat, set by the DB).
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
      variantTitle = picks.map((p) => `${p.qty}× ${flavorNames.get(p.handle)}`).join(", ");
    }

    priced.push({
      variantId: v.id,
      productId: v.product_id,
      title: product?.title ?? "Cookie box",
      variantTitle,
      imageUrl: image,
      unitPriceCents: v.price_cents,
      quantity: item.quantity,
      totalCents: v.price_cents * item.quantity,
    });
  }

  // 2) Validate the discount code (if any) against the DB.
  let discount: Discount | null = null;
  if (discountCode) {
    const { data: d } = await db
      .from("discounts")
      .select("*")
      .eq("code", discountCode.toUpperCase())
      .maybeSingle();
    const subtotal = priced.reduce((s, l) => s + l.totalCents, 0);
    if (d && isDiscountValid(d as Discount, subtotal)) discount = d as Discount;
    else if (discountCode) {
      return NextResponse.json({ error: "That code isn't valid for this order." }, { status: 422 });
    }
  }

  // Enforce once-per-customer: reject if this email already redeemed the code
  // on a paid/fulfilled order.
  if (discount?.once_per_customer) {
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("discount_id", discount.id)
      .in("status", ["paid", "fulfilled"]);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "You've already used that code." }, { status: 422 });
    }
  }

  const cart = priceCart(priced, discount);

  // 3) Upsert the customer (guest checkout friendly).
  const { data: customer } = await db
    .from("customers")
    .upsert({ email }, { onConflict: "email" })
    .select("id")
    .single();

  // 4) Create the pending order + items.
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      customer_id: customer?.id ?? null,
      email,
      status: "pending",
      subtotal_cents: cart.subtotalCents,
      discount_cents: cart.discountCents,
      shipping_cents: cart.shippingCents,
      tax_cents: cart.taxCents,
      total_cents: cart.totalCents,
      discount_id: discount?.id ?? null,
      discount_code: discount?.code ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
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
  if (cart.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cart.shippingCents,
        product_data: { name: "Shipping" },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: lineItems,
    // Apply discount as a Stripe coupon so the displayed total matches our math.
    discounts: cart.discountCents > 0 ? [{ coupon: await ensureCoupon(cart.discountCents) }] : undefined,
    success_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/success?order=${order.order_number}`,
    cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/cart`,
    metadata: { order_id: order.id },
    payment_intent_data: { metadata: { order_id: order.id } },
  });

  await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

  return NextResponse.json({ url: session.url });
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
