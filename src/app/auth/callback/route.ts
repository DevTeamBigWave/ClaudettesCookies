import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Supabase auth redirect target. Exchanges the code for a session, then
 * bootstraps the admin role: any user whose email is in ADMIN_EMAILS is
 * promoted to `admin` on sign-in. Everyone else stays `customer`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

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

  return NextResponse.redirect(new URL(next, url.origin));
}
