import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/db";
import { supabaseUrl } from "./url";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session on every request and guards /admin.
 * Returns the response (with refreshed auth cookies) to the middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Coarse role check at the edge; pages still call requireAdmin() server-side.
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profile = data as { role: string } | null;

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
