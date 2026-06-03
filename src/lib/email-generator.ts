import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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
