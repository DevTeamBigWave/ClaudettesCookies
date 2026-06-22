import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmails, env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Supabase auth redirect target. Exchanges the code for a session, then
 * bootstraps the admin role: any user whose email is in ADMIN_EMAILS is
 * promoted to `admin` on sign-in. Everyone else stays `customer`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Only allow same-site relative paths. An absolute or protocol-relative
  // `next` (e.g. `https://evil.example` or `//evil.example`) would make this an
  // open redirect that lends the real login flow to a phishing page.
  const requested = url.searchParams.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/admin";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      if (adminEmails.includes(data.user.email.toLowerCase())) {
        const admin = createAdminClient();
        await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
      }
    }
  }

  // Redirect off the canonical site URL, not the request origin: behind
  // Railway's proxy the request origin is the internal `localhost:8080`, which
  // would send the just-signed-in user to an unreachable host.
  const base = env.NEXT_PUBLIC_SITE_URL || url.origin;
  return NextResponse.redirect(new URL(next, base));
}
