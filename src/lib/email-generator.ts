import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Discount, MarketingSettings } from "@/types/db";

/**
 * Drafts one on-brand marketing email with Claude and saves it as a `draft`
 * campaign in `email_campaigns`. It is NOT sent — it appears in the admin
 * Marketing page for a human to review and send. Called from the weekly cron.
 */

const BRAND_CONTEXT = `You write marketing emails for Claudette's Cookies, a premium
small-batch cookie company. Voice: warm, confident, a little rebellious, never
spammy or hypey. Core message: "Cookies before chemistry" — real ingredients
(grass-fed butter, organic King Arthur flour, no seed oils) the way cookies were
made before the industrial revolution. The goal of each email is to delight and
gently drive a purchase, not to hard-sell. Keep it short and skimmable. Avoid
medical claims. Always give the reader one clear reason to click through to shop.`;

const EMAIL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "Short internal campaign name (admin-only label)." },
    subject: { type: "string", description: "Compelling subject line, under 60 chars, no clickbait." },
    preheader: { type: "string", description: "Preview text, under 100 chars, complements the subject." },
    body_markdown: {
      type: "string",
      description:
        "The email body in Markdown: a warm hook, 1–3 short paragraphs, optionally feature a specific box, and end with a clear call-to-action line linking to the shop. ~120–250 words. No unsubscribe footer (added automatically).",
    },
  },
  required: ["name", "subject", "preheader", "body_markdown"],
} as const;

type GeneratedEmail = {
  name: string;
  subject: string;
  preheader: string;
  body_markdown: string;
};

export async function generateMarketingDraft() {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false as const, error: "ANTHROPIC_API_KEY not configured" };
  }

  const db = createAdminClient();

  // Real products to (optionally) feature, and recent subjects to avoid repeats.
  const [{ data: products }, { data: recent }] = await Promise.all([
    db.from("products").select("title, subtitle, price_cents").eq("status", "active"),
    db.from("email_campaigns").select("subject").order("created_at", { ascending: false }).limit(10),
  ]);

  const productList = (products ?? [])
    .map(
      (p: { title: string; subtitle: string | null; price_cents: number }) =>
        `- ${p.title}${p.subtitle ? ` — ${p.subtitle}` : ""} ($${(p.price_cents / 100).toFixed(2)})`,
    )
    .join("\n");
  const recentSubjects = (recent ?? []).map((r: { subject: string }) => r.subject);

  const shopUrl = `${env.NEXT_PUBLIC_SITE_URL}/shop`;
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: BRAND_CONTEXT,
    output_config: { format: { type: "json_schema", schema: EMAIL_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write this week's marketing email for Claudette's Cookies.

Our current boxes:
${productList || "(catalog unavailable — keep it brand-level)"}

Link the call-to-action to: ${shopUrl}
${
  recentSubjects.length
    ? `\nDo NOT reuse or closely echo these recent subject lines:\n- ${recentSubjects.join("\n- ")}`
    : ""
}

Return the email as JSON matching the provided schema.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false as const, error: "No text content returned from Claude" };
  }
  const email = JSON.parse(textBlock.text) as GeneratedEmail;

  // Save as a DRAFT — segment defaults to all subscribed users. A human reviews
  // and sends it from the admin Marketing page.
  const { data: inserted, error } = await db
    .from("email_campaigns")
    .insert({
      name: email.name,
      subject: email.subject,
      preheader: email.preheader,
      from_name: "Claudette's Cookies",
      body_markdown: email.body_markdown,
      status: "draft",
      segment: { status: "subscribed" },
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, id: inserted?.id, subject: email.subject };
}

function describeDiscount(d: Discount): string {
  if (d.type === "percentage") return `${d.value}% off`;
  if (d.type === "fixed_amount") return `$${(d.value / 100).toFixed(2)} off`;
  return "free shipping";
}

/**
 * Composes Saturday's Journal-roundup marketing email and saves it as a DRAFT
 * (never auto-sent — a human reviews/sends it). Features the new posts and, per
 * the admin `marketing_settings`, an optional featured promotion and/or a
 * free-text offer, in either "add" (posts lead) or "overwrite" (offer leads) mode.
 */
export async function generateSaturdayEmailDraft(
  posts: { slug: string; title: string; excerpt: string }[],
) {
  if (!env.ANTHROPIC_API_KEY) return { ok: false as const, error: "ANTHROPIC_API_KEY not configured" };
  if (posts.length === 0) return { ok: false as const, error: "No posts to feature" };

  const db = createAdminClient();

  const { data: settings } = await db
    .from("marketing_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<MarketingSettings>();

  // Resolve the featured promotion only if it's still active and unexpired.
  let promo: Discount | null = null;
  if (settings?.featured_discount_id) {
    const { data: d } = await db
      .from("discounts")
      .select("*")
      .eq("id", settings.featured_discount_id)
      .maybeSingle<Discount>();
    if (d && d.active && (!d.ends_at || new Date(d.ends_at) > new Date())) promo = d;
  }
  const offerNote = settings?.offer_note?.trim() ?? "";
  const mode: "add" | "overwrite" = settings?.offer_mode === "overwrite" ? "overwrite" : "add";

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const postLines = posts
    .map((p) => `- "${p.title}" — ${p.excerpt} (${siteUrl}/blog/${p.slug})`)
    .join("\n");

  const offerParts: string[] = [];
  if (promo) {
    const min = promo.min_subtotal_cents ? `, min $${(promo.min_subtotal_cents / 100).toFixed(2)}` : "";
    const exp = promo.ends_at ? `, expires ${new Date(promo.ends_at).toLocaleDateString("en-US")}` : "";
    offerParts.push(`Promo code ${promo.code}: ${describeDiscount(promo)}${min}${exp}.`);
  }
  if (offerNote) offerParts.push(offerNote);

  const offerBlock = offerParts.length
    ? `\nThis week's offer (${
        mode === "overwrite"
          ? "make this the LEAD of the email; the new posts are a secondary mention"
          : "include as a secondary mention; the new posts are the lead"
      }):\n${offerParts.join("\n")}\nPut the offer's call-to-action link to ${siteUrl}/shop.`
    : "";

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: BRAND_CONTEXT,
    output_config: { format: { type: "json_schema", schema: EMAIL_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write Saturday's Journal-roundup email for Claudette's Cookies.

Feature these three brand-new Journal posts — link each by its title to its URL:
${postLines}
${offerBlock}

Keep it warm, skimmable, and short. Return the email as JSON matching the schema.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false as const, error: "No text content returned from Claude" };
  }
  const email = JSON.parse(textBlock.text) as GeneratedEmail;

  const { data: inserted, error } = await db
    .from("email_campaigns")
    .insert({
      name: email.name,
      subject: email.subject,
      preheader: email.preheader,
      from_name: "Claudette's Cookies",
      body_markdown: email.body_markdown,
      status: "draft",
      segment: { status: "subscribed" },
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: inserted?.id, subject: email.subject };
}
