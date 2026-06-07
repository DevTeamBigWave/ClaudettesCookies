"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaign } from "@/lib/campaigns";
import { generateAndPublishPosts } from "@/lib/blog-generator";
import { slugify } from "@/lib/utils";
import type { DiscountType } from "@/types/db";

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

/** Generate + publish a drop of on-brand posts via Claude, on demand from the admin. */
export async function generateBlogPostNow() {
  await requireAdmin();
  const result = await generateAndPublishPosts();
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true, count: result.published.length };
}
