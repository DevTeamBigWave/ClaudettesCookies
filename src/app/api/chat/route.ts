import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { CLEAN_LABEL } from "@/lib/data/clean-label";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

/** Build the system prompt, grounded in the live catalog + clean-label data. */
async function buildSystemPrompt(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("title, subtitle, description, price_cents, allergens")
    .eq("status", "active")
    .order("position", { ascending: true });

  type Row = {
    title: string;
    subtitle: string | null;
    description: string | null;
    price_cents: number;
    allergens: string[] | null;
  };
  const products = (data as Row[] | null) ?? [];

  const catalog = products
    .map((p) => {
      const allergens = p.allergens?.join(", ");
      return `• ${p.title}${p.subtitle ? ` — ${p.subtitle}` : ""} ($${(p.price_cents / 100).toFixed(
        2,
      )})\n  ${p.description ?? ""}${allergens ? `\n  Allergens: ${allergens}` : ""}`;
    })
    .join("\n");

  const ingredients = CLEAN_LABEL.map(
    (c) => `• ${c.name}${c.gf ? " (gluten-free)" : ""} — ${c.subtitle}: ${c.ingredients.replace(/\*/g, "")}`,
  ).join("\n");

  return `You are the friendly assistant for Claudette's Cookies, a premium small-batch
cookie company. Voice: warm, confident, concise, a little playful — never pushy.
Brand: "Cookies before chemistry" — real ingredients (grass-fed butter, organic
King Arthur flour, no seed oils, no gums) the way cookies were made before the
industrial revolution.

Help customers: answer questions about the boxes, flavors, ingredients, and
allergens; recommend a box based on their taste or dietary needs; and point them
to the shop to buy. Keep replies short and skimmable (2–4 sentences, or a tight
list). Respond directly with your final answer only — no preamble or meta-commentary.

Rules:
- Use ONLY the catalog and ingredient info below for product facts. If you don't
  know something (order status, exact shipping dates/costs, refunds), say so and
  suggest they email claudettescookies@gmail.com or check their account.
- Never invent products, prices, ingredients, or promotions.
- No medical or health claims. You may note dietary facts (e.g. "gluten-free").
- To send someone to buy, point them to the shop page ("/shop") or a specific box.

== CURRENT BOXES ==
${catalog || "(catalog temporarily unavailable)"}

== PER-COOKIE INGREDIENTS (the Clean Label) ==
${ingredients}`;
}

export async function POST(req: Request) {
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Chat is not configured yet." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Validate + sanitize the conversation.
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response("A user message is required", { status: 400 });
  }

  const system = await buildSystemPrompt();
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "disabled" },
    system,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        console.error("Chat stream error:", e);
        controller.enqueue(encoder.encode("\n\n(Sorry — something went wrong. Please try again.)"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
