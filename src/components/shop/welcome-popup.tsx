"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackLead } from "@/lib/analytics";

const STORAGE_KEY = "cc_welcome_offer"; // value: "subscribed" | "dismissed"
const SHOW_DELAY_MS = 12_000;

/**
 * First-visit 10%-off email capture. The same incentive lived only in the
 * footer, so cold ad traffic that didn't scroll never saw it. This surfaces it
 * to capture the ~97% who don't buy on visit one, so they can be remarketed.
 *
 * Restraint by design: shows once (remembered in localStorage), never on
 * cart/checkout, and only after a delay or exit-intent — so it doesn't trip
 * Google's intrusive-interstitial penalty or annoy buyers mid-funnel. Submits
 * to the existing /api/newsletter endpoint, which sends the WELCOME10 email.
 */
export function WelcomePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const suppressed = pathname?.startsWith("/checkout") || pathname?.startsWith("/cart");

  useEffect(() => {
    if (suppressed) return;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      setOpen(true);
      cleanup();
    };

    // Exit-intent (desktop): pointer leaves toward the top of the viewport.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const timer = window.setTimeout(trigger, SHOW_DELAY_MS);
    document.addEventListener("mouseout", onMouseOut);

    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseOut);
    }
    return cleanup;
  }, [suppressed]);

  function remember(value: "subscribed" | "dismissed") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private mode — fine, popup just may reappear next session */
    }
  }

  function close() {
    setOpen(false);
    remember("dismissed");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "welcome-popup" }),
      });
      if (!res.ok) throw new Error("bad status");
      remember("subscribed");
      trackLead("welcome-popup");
      setState("done");
      window.setTimeout(() => setOpen(false), 3500);
    } catch {
      setState("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Get 10% off your first box"
    >
      <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="p-8 text-center">
          {state === "done" ? (
            <>
              <p className="font-display text-2xl font-semibold text-[hsl(var(--maroon))]">
                You&rsquo;re in! 🍪
              </p>
              <p className="mt-3 text-muted-foreground">
                Check your inbox — your <span className="font-semibold">10% off</span> code is on
                its way.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Everybody Eats!
              </p>
              <p className="mt-2 font-display text-3xl font-semibold leading-tight text-[hsl(var(--maroon))]">
                Get 10% off
                <br />
                your first box
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Join the list for your code, new flavors, and the occasional treat. No seed oils,
                no spam.
              </p>
              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
                <Button type="submit" size="lg" disabled={state === "loading"}>
                  {state === "loading" ? "Sending…" : "Send my 10% off"}
                </Button>
                {state === "error" && (
                  <p className="text-sm text-destructive">Something went wrong — try again.</p>
                )}
              </form>
              <button
                onClick={close}
                className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                No thanks, I&rsquo;ll pay full price
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
