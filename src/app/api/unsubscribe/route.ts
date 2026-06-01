import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** One-click unsubscribe via tokenized link in every marketing email. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new NextResponse("Invalid link", { status: 400 });

  const db = createAdminClient();
  await db
    .from("email_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token);

  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui;text-align:center;padding:64px;background:#f7f0e3;color:#2c2118">
     <h1 style="font-family:Georgia,serif">You're unsubscribed</h1>
     <p>You won't receive marketing emails from Claudette's Cookies anymore. We'll miss you.</p>
     <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#b02a44">Back to the shop</a></p>
     </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
