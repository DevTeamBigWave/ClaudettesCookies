import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/emails";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  source: z.string().max(60).optional(),
  fullName: z.string().max(120).optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  // SMS opt-in consent from the signup checkbox (defaults unchecked on the client).
  smsConsent: z.boolean().optional(),
  // Structured lead context (e.g. funnel quiz answers + computed result).
  metadata: z.record(z.unknown()).optional(),
  // Honeypot: bots fill hidden fields. A non-empty value = silently accept, no write.
  hp: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const { email, source, fullName, phone, smsConsent, metadata, hp } = parsed.data;

  // Honeypot tripped — pretend success so bots get no signal, but store nothing.
  if (hp && hp.trim()) {
    return NextResponse.json({ ok: true });
  }

  const db = createAdminClient();

  // Upsert; if they previously unsubscribed, re-subscribing is intentional here.
  const { data: existing } = await db
    .from("email_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  let subscriberId: string | null = existing?.id ?? null;

  if (existing) {
    if (existing.status !== "subscribed") {
      await db
        .from("email_subscribers")
        .update({ status: "subscribed", unsubscribed_at: null })
        .eq("id", existing.id);
    }
  } else {
    const { data: inserted } = await db
      .from("email_subscribers")
      .insert({
        email,
        full_name: fullName ?? null,
        source: source ?? "site",
        status: "subscribed",
      })
      .select("id")
      .single();
    subscriberId = inserted?.id ?? null;

    // Fire-and-forget welcome email; don't fail the signup if email hiccups.
    sendEmail({
      to: email,
      subject: "Welcome to Claudette's — here's 10% off 🍪",
      html: welcomeEmail(env.NEXT_PUBLIC_SITE_URL),
    }).catch((e) => console.error("Welcome email failed:", e));
  }

  // Patch only the fields actually provided, so a metadata-only funnel lead can't
  // wipe an existing subscriber's phone/consent. Tolerant: a not-yet-applied
  // migration (0016 sms_consent / 0018 metadata) can't break the signup.
  if (subscriberId) {
    const patch: Record<string, unknown> = {};
    if (phone !== undefined) patch.phone = phone;
    if (smsConsent !== undefined) {
      patch.sms_consent = Boolean(smsConsent);
      patch.sms_consent_at = smsConsent ? new Date().toISOString() : null;
    }
    if (metadata !== undefined) patch.metadata = metadata;
    if (Object.keys(patch).length) {
      const { error: patchErr } = await db.from("email_subscribers").update(patch).eq("id", subscriberId);
      if (patchErr) console.error("Could not save lead details (run migrations 0016/0018):", patchErr.message);
    }
  }

  return NextResponse.json({ ok: true, alreadySubscribed: Boolean(existing) });
}
