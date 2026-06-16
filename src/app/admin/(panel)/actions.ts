"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaign } from "@/lib/campaigns";
import { startBackgroundDrop } from "@/lib/blog-generator";
import { slugify, generateGiftCardCode } from "@/lib/utils";
import { env } from "@/lib/env";
import { sendEmail, STORE_EMAIL } from "@/lib/resend";
import { orderShippedEmail, giftCardEmail } from "@/lib/emails";
import { trackPackage } from "@/lib/labels";
import { trackingUrl } from "@/lib/tracking";
import { deleteAbandonedOrders } from "@/lib/cleanup";
import type { DiscountType, BlogGenerationJob } from "@/types/db";

// ── Products ────────────────────────────────────────────────────────────────
export async function setProductStatus(productId: string, status: "active" | "draft" | "archived") {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("products").update({ status }).eq("id", productId);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function updateVariantInventory(variantId: string, qty: number) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("product_variants").update({ inventory_qty: Math.max(0, qty) }).eq("id", variantId);
  revalidatePath("/admin/products");
}

// ── Promotions ──────────────────────────────────────────────────────────────
const DiscountInput = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  value: z.coerce.number().int().min(0).default(0),
  min_subtotal_cents: z.coerce.number().int().min(0).default(0),
  usage_limit: z.coerce.number().int().min(0).optional(),
  ends_at: z.string().optional(),
  one_time: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
  once_per_customer: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
});

/** datetime-local string → ISO (UTC), or null when blank. */
function toIso(v?: string): string | null {
  return v && v.trim() ? new Date(v).toISOString() : null;
}

/** Shared insert/update payload from the validated form. */
function discountPayload(d: z.infer<typeof DiscountInput>) {
  return {
    code: d.code.toUpperCase(),
    type: d.type as DiscountType,
    value: d.type === "percentage" ? Math.min(100, d.value) : d.value,
    min_subtotal_cents: d.min_subtotal_cents,
    usage_limit: d.one_time ? 1 : d.usage_limit && d.usage_limit > 0 ? d.usage_limit : null,
    ends_at: toIso(d.ends_at),
    once_per_customer: Boolean(d.once_per_customer),
  };
}

export async function createDiscount(formData: FormData) {
  await requireAdmin();
  const parsed = DiscountInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the discount fields." };

  const db = createAdminClient();
  const { error } = await db.from("discounts").insert({ ...discountPayload(parsed.data), active: true });
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions");
  return { ok: true };
}

export async function updateDiscount(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = DiscountInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the discount fields." };

  const db = createAdminClient();
  const { error } = await db.from("discounts").update(discountPayload(parsed.data)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions");
  return { ok: true };
}

export async function deleteDiscount(id: string) {
  await requireAdmin();
  const db = createAdminClient();
  // Orders reference discounts with ON DELETE SET NULL, so this is safe; the
  // human-readable discount_code stays on past orders.
  await db.from("discounts").delete().eq("id", id);
  revalidatePath("/admin/promotions");
}

export async function toggleDiscount(id: string, active: boolean) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("discounts").update({ active }).eq("id", id);
  revalidatePath("/admin/promotions");
}

// ── Email campaigns ─────────────────────────────────────────────────────────
const CampaignInput = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(160),
  preheader: z.string().max(160).optional(),
  body_markdown: z.string().min(1),
  segment_status: z.enum(["subscribed", "pending"]).default("subscribed"),
  scheduled_at: z.string().optional(),
});

export async function createCampaign(formData: FormData) {
  const profile = await requireAdmin();
  const parsed = CampaignInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the campaign fields." };

  const db = createAdminClient();
  const { name, subject, preheader, body_markdown, segment_status, scheduled_at } = parsed.data;
  const willSchedule = scheduled_at && new Date(scheduled_at) > new Date();

  const { data, error } = await db
    .from("email_campaigns")
    .insert({
      name,
      subject,
      preheader: preheader ?? null,
      body_markdown,
      segment: { status: segment_status },
      status: willSchedule ? "scheduled" : "draft",
      scheduled_at: willSchedule ? new Date(scheduled_at!).toISOString() : null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true, id: data?.id };
}

export async function sendCampaignNow(campaignId: string) {
  await requireAdmin();
  const result = await sendCampaign(campaignId);
  revalidatePath("/admin/marketing");
  return result;
}

// ── Saturday email offer (drives the weekly Journal-roundup draft) ───────────
const MarketingSettingsInput = z.object({
  featured_discount_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  offer_note: z.string().max(1000).optional(),
  offer_mode: z.enum(["add", "overwrite"]).default("add"),
});

export async function saveMarketingSettings(formData: FormData) {
  await requireAdmin();
  const parsed = MarketingSettingsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the offer fields." };

  const db = createAdminClient();
  const { featured_discount_id, offer_note, offer_mode } = parsed.data;
  const { error } = await db.from("marketing_settings").upsert({
    id: 1,
    featured_discount_id: featured_discount_id ? featured_discount_id : null,
    offer_note: offer_note?.trim() ? offer_note.trim() : null,
    offer_mode,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true };
}

// ── Blog ────────────────────────────────────────────────────────────────────
const PostInput = z.object({
  title: z.string().trim().min(2).max(160),
  excerpt: z.string().max(280).optional(),
  body: z.string().min(1),
  tags: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function createPost(formData: FormData) {
  await requireAdmin();
  const parsed = PostInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the post fields." };

  const db = createAdminClient();
  const { title, excerpt, body, tags, status } = parsed.data;
  const { error } = await db.from("blog_posts").insert({
    slug: slugify(title),
    title,
    excerpt: excerpt ?? null,
    body,
    tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true };
}

export async function setPostStatus(id: string, status: "draft" | "published") {
  await requireAdmin();
  const db = createAdminClient();
  await db
    .from("blog_posts")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

/**
 * Start a drop in the background and return its job id right away, so the admin
 * can leave the page while Claude writes. Status is polled via
 * {@link getLatestBlogJob}; published posts land in the table when it finishes.
 */
export async function startBlogDrop() {
  await requireAdmin();
  return startBackgroundDrop();
}

/** Latest drop job (running/done/error) — drives the admin button's status. */
export async function getLatestBlogJob() {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("blog_generation_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BlogGenerationJob) ?? null;
}

// ── Fulfillment ───────────────────────────────────────────────────────────────
const ShipInput = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().trim().max(60).optional(),
  carrier: z.string().trim().max(40).default("FedEx"),
});

/**
 * Shopify-style "Mark as shipped": flips the order to fulfilled, records the
 * carrier + tracking + ship time, and emails the customer their tracking link.
 * Tracking is optional (you can fulfill without it).
 */
export async function markOrderShipped(formData: FormData) {
  await requireAdmin();
  const parsed = ShipInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { orderId, trackingNumber, carrier } = parsed.data;
  const db = createAdminClient();
  const tracking = trackingNumber || null;

  await db
    .from("orders")
    .update({
      fulfillment: "fulfilled",
      shipped_at: new Date().toISOString(),
      tracking_number: tracking,
      shipping_carrier: carrier,
      delivery_status: tracking ? "in_transit" : null,
      delivered_at: null,
    })
    .eq("id", orderId);

  const { data: order } = await db
    .from("orders")
    .select("order_number, email")
    .eq("id", orderId)
    .single();
  if (order) {
    const url = tracking ? trackingUrl(carrier, tracking) : null;
    await sendEmail({
      to: order.email,
      cc: STORE_EMAIL,
      subject: `Your Claudette's order #${order.order_number} has shipped 🍪`,
      html: orderShippedEmail({
        orderNumber: order.order_number,
        carrier,
        trackingNumber: tracking,
        trackingUrl: url,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    }).catch((e) => console.error("Shipped email failed:", e));
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/** Manually purge abandoned checkouts (pending orders > 24h old). */
export async function cleanupAbandonedOrders(): Promise<{ deleted: number }> {
  await requireAdmin();
  const deleted = await deleteAbandonedOrders(24);
  revalidatePath("/admin/orders");
  return { deleted };
}

// ── Gift cards ────────────────────────────────────────────────────────────────
const IssueGiftCardInput = z.object({
  amountDollars: z.coerce.number().positive().max(1000),
  recipientEmail: z.union([z.string().email(), z.literal("")]).optional(),
  recipientName: z.string().trim().max(80).optional(),
  giftMessage: z.string().trim().max(500).optional(),
  expiresAt: z.string().optional(),
});

/**
 * Issue a gift card directly from the admin (comps, promos, support). Creates an
 * active card with a fresh code and, if a recipient email is given, emails it.
 * Returns the new code so the admin can copy/share it.
 */
export async function issueGiftCard(input: {
  amountDollars: string | number;
  recipientEmail?: string;
  recipientName?: string;
  giftMessage?: string;
  expiresAt?: string;
}): Promise<{ code: string } | { error: string }> {
  await requireAdmin();
  const parsed = IssueGiftCardInput.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid amount (up to $1,000)." };
  const { amountDollars, recipientEmail, recipientName, giftMessage, expiresAt } = parsed.data;
  const cents = Math.round(amountDollars * 100);
  if (cents <= 0) return { error: "Amount must be more than $0." };

  const db = createAdminClient();
  const code = generateGiftCardCode();
  const { error } = await db.from("gift_cards").insert({
    code,
    initial_cents: cents,
    balance_cents: cents,
    status: "active",
    recipient_email: recipientEmail || null,
    recipient_name: recipientName || null,
    gift_message: giftMessage || null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
  if (error) {
    console.error("Issue gift card failed:", error.message);
    return { error: "Could not issue the gift card." };
  }

  if (recipientEmail) {
    await sendEmail({
      to: recipientEmail,
      cc: STORE_EMAIL,
      subject: "🎁 You've got a Claudette's gift card",
      html: giftCardEmail({
        code,
        amountCents: cents,
        recipientName: recipientName || "friend",
        senderMessage: giftMessage,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    }).catch((e) => console.error("Gift card email failed:", e));
  }

  revalidatePath("/admin/gift-cards");
  return { code };
}

/** Mark a local-pickup order as collected (fulfilled). No label/tracking. */
export async function markOrderPickedUp(orderId: string) {
  await requireAdmin();
  const db = createAdminClient();
  await db
    .from("orders")
    .update({ fulfillment: "fulfilled", shipped_at: new Date().toISOString() })
    .eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/** Undo fulfillment (e.g. shipped by mistake). Clears ship + delivery state. */
export async function markOrderUnfulfilled(orderId: string) {
  await requireAdmin();
  const db = createAdminClient();
  await db
    .from("orders")
    .update({ fulfillment: "unfulfilled", shipped_at: null, delivery_status: null, delivered_at: null })
    .eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/** Poll FedEx for the live delivery status of an order's tracking number. */
export async function refreshDeliveryStatus(
  orderId: string,
): Promise<{ status: string; text: string } | { error: string }> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("tracking_number, shipping_carrier")
    .eq("id", orderId)
    .single();
  if (!order?.tracking_number) return { error: "No tracking number on this order." };

  try {
    const result = await trackPackage(order.tracking_number, order.shipping_carrier);
    await db
      .from("orders")
      .update({ delivery_status: result.status, delivered_at: result.deliveredAt })
      .eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { status: result.status, text: result.statusText };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not fetch tracking.";
    // The FedEx Track API isn't authorized yet (production access pending), so
    // keep this calm and point to the Track package link instead of dumping a
    // scary credentials error.
    if (/\b40[13]\b|authoriz|credential|forbidden|configured/i.test(msg)) {
      return {
        error: "Live FedEx tracking isn't connected yet — use the Track package link to check status.",
      };
    }
    return { error: msg };
  }
}
