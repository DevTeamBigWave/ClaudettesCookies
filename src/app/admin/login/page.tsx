"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.73Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3a7.2 7.2 0 0 1-10.76-3.78H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.32a7.2 7.2 0 0 1 0-4.64v-3.1H1.29a12 12 0 0 0 0 10.84l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.58l4.01 3.1A7.2 7.2 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const params = useSearchParams();
  const forbidden = params.get("error") === "forbidden";

  // Always send the auth redirect to the canonical site URL, never the current
  // origin. Otherwise opening admin from a stale `localhost` bookmark bakes
  // localhost into the magic-link / OAuth redirect and sign-in bounces to a
  // host the phone can't reach. Falls back to the live domain if env is unset.
  const authBase =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.claudettescookies.shop";
  const redirectTo = `${authBase}/auth/callback?next=/admin`;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    // On success the browser is redirected to Google; we only reach here on error.
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <p className="font-display text-2xl font-semibold">Claudette&rsquo;s Admin</p>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage the store.</p>

        {forbidden && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            That account isn&rsquo;t authorized for the admin panel.
          </p>
        )}

        {sent ? (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm">
            Check <strong>{email}</strong> for a magic sign-in link.
          </p>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full gap-2"
              onClick={signInWithGoogle}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={sendLink} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="ghost" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Email me a login link instead"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
