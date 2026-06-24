"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // SMS consent MUST start unchecked and be separate from any "agree to terms" box.
  const [smsConsent, setSmsConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone: phone || undefined, smsConsent, source }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-primary">
        You&rsquo;re in. Check your inbox for a welcome treat. 🍪
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />
        <Button type="submit" disabled={state === "loading"}>
          {state === "loading" ? "Joining…" : "Join the list"}
        </Button>
      </div>

      {/* SMS opt-in — phone optional; consent checkbox unchecked by default. */}
      <Input
        type="tel"
        placeholder="(555) 555-5555 — optional, for texts"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        aria-label="Mobile number (optional)"
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="sms_consent"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>
          I agree to receive recurring automated marketing and order text messages from
          Claudette&apos;s Cookies at the number provided. Consent is not a condition of purchase.
          Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for
          help. See our{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms
          </Link>
          .
        </span>
      </label>

      {state === "error" && (
        <p className="text-sm text-destructive">Something went wrong — try again.</p>
      )}
    </form>
  );
}
