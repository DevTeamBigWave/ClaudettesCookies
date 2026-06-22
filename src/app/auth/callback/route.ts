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

  // Stay on the SAME public host the browser used (apex or www) so the session
  // cookie just set during the code exchange is sent back on this redirect — a
  // cross-host bounce (e.g. apex → www) drops the cookie and loops sign-in.
  // Behind Railway's proxy `req.url` is the internal localhost:8080, so derive
  // the real host from the forwarded headers; fall back to the canonical URL.
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = fwdHost ? `${fwdProto}://${fwdHost}` : env.NEXT_PUBLIC_SITE_URL || url.origin;
  return NextResponse.redirect(new URL(next, base));
}
