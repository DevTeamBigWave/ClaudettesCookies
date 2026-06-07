import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Generates a drop of on-brand Journal posts with Claude and publishes them to
 * `blog_posts`. Called from the weekly cron (`/api/cron/generate-blog-post`) and
 * the admin "Generate" button. Service-role write, so it runs server-side only.
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

/** How many posts a single "drop" publishes (button + weekly cron). */
export const DROP_SIZE = 3;

/** Ask Claude for one post, steering it away from `avoidTitles`. */
async function generateOne(anthropic: Anthropic, avoidTitles: string[]): Promise<GeneratedPost> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: BRAND_CONTEXT,
    output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write a Journal post for Claudette's Cookies. Pick a fresh angle —
an ingredient deep-dive, a flavor story, a "why we don't use X" explainer, a baking
ritual, or a seasonal note. Make it genuinely useful or charming, not an ad.

${
  avoidTitles.length
    ? `Do NOT repeat or closely overlap these existing titles:\n- ${avoidTitles.join("\n- ")}`
    : ""
}

Return the post as JSON matching the provided schema.`,
      },
    ],
  });

  // With structured outputs the first text block is schema-valid JSON.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from Claude");
  }
  return JSON.parse(textBlock.text) as GeneratedPost;
}

/** Find a free slug: `title-YYYY-MM-DD`, then `-2`, `-3`… if it's taken. */
async function uniqueSlug(db: ReturnType<typeof createAdminClient>, title: string): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10);
  const base = `${slugify(title)}-${datePart}`;
  let candidate = base;
  let n = 1;
  for (;;) {
    const { data } = await db.from("blog_posts").select("slug").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export type PublishedPost = { slug: string; title: string; excerpt: string };

export type DropResult =
  | { ok: false; error: string }
  | { ok: true; published: PublishedPost[]; errors: string[] };

/**
 * Generates and publishes a drop of on-brand posts (default {@link DROP_SIZE}).
 * Existing titles — plus those created earlier in this same drop — are fed back
 * to Claude so the batch never repeats itself. Partial success is allowed: any
 * posts that made it through are returned, with per-post failures in `errors`.
 */
export async function generateAndPublishPosts(count: number = DROP_SIZE): Promise<DropResult> {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  const db = createAdminClient();

  // Seed the avoid-list with recent titles so Claude doesn't repeat itself.
  const { data: recent } = await db
    .from("blog_posts")
    .select("title")
    .order("published_at", { ascending: false })
    .limit(10);
  const avoidTitles = (recent ?? []).map((r: { title: string }) => r.title);

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const published: PublishedPost[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const post = await generateOne(anthropic, avoidTitles);
      avoidTitles.push(post.title); // keep the rest of the drop distinct
      const slug = await uniqueSlug(db, post.title);

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
        errors.push(error.message);
        continue;
      }
      published.push({ slug, title: post.title, excerpt: post.excerpt });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Unknown generation error");
    }
  }

  if (published.length === 0) {
    return { ok: false, error: errors[0] ?? "No posts were generated" };
  }
  return { ok: true, published, errors };
}
