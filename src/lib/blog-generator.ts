import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Generates one on-brand blog post with Claude and publishes it to `blog_posts`.
 * Called from the weekly cron (`/api/cron/generate-blog-post`). Service-role
 * write, so it runs server-side only.
 */

const BRAND_CONTEXT = `You write the blog ("The Journal") for Claudette's Cookies,
a premium small-batch cookie company. Brand voice: warm, confident, a little
rebellious, never preachy. Core message: "Cookies before chemistry" — real
ingredients (grass-fed butter, organic King Arthur flour, no seed oils, no gums
or mystery "natural flavors") the way cookies were made before the industrial
revolution. Moroccan-inspired warmth. Signature flavors include The Sicilian
(pistachio), The Disco Drop (gluten-free oat & banana), The Lunchbox (PB&J),
and The Sunday Morning (chocolate chip walnut). Audience: people who care about
clean eating but still want indulgence. Avoid medical claims and absolute health
promises.`;

/** JSON shape we ask Claude to return, enforced via structured outputs. */
const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Punchy, specific post title (no quotes)." },
    excerpt: { type: "string", description: "1–2 sentence teaser, under 200 chars." },
    body: {
      type: "string",
      description:
        "The full post in Markdown: 500–800 words, with a couple of `##` subheadings and short paragraphs. No H1 (the title is rendered separately).",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "2–4 lowercase topical tags.",
    },
  },
  required: ["title", "excerpt", "body", "tags"],
} as const;

type GeneratedPost = {
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
};

/** Turn a title into a URL-safe slug. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function generateAndPublishPost() {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false as const, error: "ANTHROPIC_API_KEY not configured" };
  }

  const db = createAdminClient();

  // Give Claude the last few titles so it doesn't repeat itself.
  const { data: recent } = await db
    .from("blog_posts")
    .select("title")
    .order("published_at", { ascending: false })
    .limit(10);
  const recentTitles = (recent ?? []).map((r: { title: string }) => r.title);

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: BRAND_CONTEXT,
    output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write this week's Journal post for Claudette's Cookies. Pick a fresh angle —
an ingredient deep-dive, a flavor story, a "why we don't use X" explainer, a baking
ritual, or a seasonal note. Make it genuinely useful or charming, not an ad.

${
  recentTitles.length
    ? `Do NOT repeat or closely overlap these recent titles:\n- ${recentTitles.join("\n- ")}`
    : ""
}

Return the post as JSON matching the provided schema.`,
      },
    ],
  });

  // With structured outputs the first text block is schema-valid JSON.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false as const, error: "No text content returned from Claude" };
  }
  const post = JSON.parse(textBlock.text) as GeneratedPost;

  // Build a unique slug (title + ISO date keeps weekly posts from colliding).
  const datePart = new Date().toISOString().slice(0, 10);
  const slug = `${slugify(post.title)}-${datePart}`;

  const { error } = await db.from("blog_posts").insert({
    slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    tags: post.tags ?? [],
    status: "published",
    published_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, slug, title: post.title };
}
