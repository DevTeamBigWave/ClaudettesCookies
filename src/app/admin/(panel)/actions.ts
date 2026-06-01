"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaign } from "@/lib/campaigns";
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
  value: z.coerce.number().int().min(0),
  min_subtotal_cents: z.coerce.number().int().min(0).default(0),
  usage_limit: z.coerce.number().int().min(0).optional(),
});

export async function createDiscount(formData: FormData) {
  await requireAdmin();
  const parsed = DiscountInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the discount fields." };

  const db = createAdminClient();
  const { code, type, value, min_subtotal_cents, usage_limit } = parsed.data;
  const { error } = await db.from("discounts").insert({
    code: code.toUpperCase(),
    type: type as DiscountType,
    value: type === "percentage" ? Math.min(100, value) : value,
    min_subtotal_cents,
    usage_limit: usage_limit && usage_limit > 0 ? usage_limit : null,
    active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions");
  return { ok: true };
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
