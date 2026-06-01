import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/emails";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  source: z.string().max(40).optional(),
  fullName: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const { email, source, fullName } = parsed.data;
  const db = createAdminClient();

  // Upsert; if they previously unsubscribed, re-subscribing is intentional here.
  const { data: existing } = await db
    .from("email_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "subscribed") {
      await db
        .from("email_subscribers")
        .update({ status: "subscribed", unsubscribed_at: null })
        .eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  await db.from("email_subscribers").insert({
    email,
    full_name: fullName ?? null,
    source: source ?? "site",
    status: "subscribed",
  });

  // Fire-and-forget welcome email; don't fail the signup if email hiccups.
  sendEmail({
    to: email,
    subject: "Welcome to Claudette's — here's 10% off 🍪",
    html: welcomeEmail(env.NEXT_PUBLIC_SITE_URL),
  }).catch((e) => console.error("Welcome email failed:", e));

  return NextResponse.json({ ok: true });
}
