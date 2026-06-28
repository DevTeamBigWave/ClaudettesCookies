"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFunnel, type FunnelResult } from "@/config/funnels";
import { trackEvent, trackLead } from "@/lib/analytics";
import { formatMoney } from "@/lib/utils";

/** Minimal product info the reveal needs, passed from the server page. */
export interface CatalogItem {
  handle: string;
  title: string;
  fullTitle: string;
  priceCents: number;
  image: string | null;
  subtitle: string | null;
}

export function Quiz({
  slug,
  catalog,
}: {
  slug: string;
  catalog: Record<string, CatalogItem>;
}) {
  const funnel = getFunnel(slug)!; // server guarantees a valid slug

  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 0 = segment question; 1..N = the chosen segment's steps; N+1 = reveal.
  const [stepIndex, setStepIndex] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackEvent("funnel_started", { funnel: slug });
  }, [slug]);

  const segment = answers.segment
    ? funnel.segments.find((s) => s.value === answers.segment) ?? null
    : null;
  const steps = segment?.steps ?? [];
  const revealIndex = 1 + steps.length;
  const isReveal = segment !== null && stepIndex >= revealIndex;

  // Progress: estimate total before a segment is picked (most segments are 2 steps).
  const estimatedFollowups = segment ? steps.length : 2;
  const totalStops = 1 + estimatedFollowups + 1; // segment + follow-ups + reveal
  const progress = Math.min(100, Math.round((stepIndex / (totalStops - 1)) * 100));

  // Fire result_viewed once, when the reveal first shows.
  const revealedRef = useRef(false);
  useEffect(() => {
    if (isReveal && !revealedRef.current) {
      revealedRef.current = true;
      const result = funnel.computeResult(answers);
      trackEvent("result_viewed", { funnel: slug, product: result.productHandle });
    }
  }, [isReveal, answers, funnel, slug]);

  function pickSegment(value: string) {
    setAnswers({ segment: value }); // changing segment resets later picks
    trackEvent("step_completed", { funnel: slug, step: "segment", value });
    setStepIndex(1);
  }

  function pickStep(idx: number, key: string, value: string) {
    setAnswers((prev) => {
      // keep the segment + earlier steps, drop anything after this one
      const next: Record<string, string> = { segment: prev.segment };
      for (let i = 0; i < idx; i++) {
        const k = steps[i].key;
        if (prev[k]) next[k] = prev[k];
      }
      next[key] = value;
      return next;
    });
    trackEvent("step_completed", { funnel: slug, step: key, value });
    setStepIndex(1 + idx + 1);
  }

  function back() {
    revealedRef.current = false;
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function restart() {
    revealedRef.current = false;
    setAnswers({});
    setStepIndex(0);
  }

  return (
    <div className="container max-w-xl py-8 sm:py-12">
      {/* Progress */}
      <div className="mb-6">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quiz progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
        {stepIndex > 0 && !isReveal && (
          <button
            onClick={back}
            className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        )}
      </div>

      {/* Step 0 — segment (the branch) */}
      {stepIndex === 0 && (
        <Step title={funnel.intro.heading} sub={funnel.segmentQuestion} eyebrow={funnel.intro.eyebrow}>
          {funnel.segments.map((s) => (
            <OptionButton
              key={s.value}
              label={s.label}
              hint={s.hint}
              selected={answers.segment === s.value}
              onClick={() => pickSegment(s.value)}
            />
          ))}
        </Step>
      )}

      {/* Follow-up steps for the chosen segment */}
      {segment &&
        stepIndex >= 1 &&
        stepIndex <= steps.length &&
        (() => {
          const idx = stepIndex - 1;
          const step = steps[idx];
          return (
            <Step key={step.key} title={step.question}>
              {step.options.map((o) => (
                <OptionButton
                  key={o.value}
                  label={o.label}
                  hint={o.hint}
                  selected={answers[step.key] === o.value}
                  onClick={() => pickStep(idx, step.key, o.value)}
                />
              ))}
            </Step>
          );
        })()}

      {/* Reveal */}
      {isReveal && (
        <Reveal
          slug={slug}
          result={funnel.computeResult(answers)}
          answers={answers}
          catalog={catalog}
          onRestart={restart}
        />
      )}
    </div>
  );
}

function Step({
  title,
  sub,
  eyebrow,
  children,
}: {
  title: string;
  sub?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      )}
      <h1 className="font-display text-3xl font-semibold leading-tight text-[hsl(var(--maroon))]">
        {title}
      </h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
      <div className="mt-6 grid gap-3">{children}</div>
    </div>
  );
}

function OptionButton({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40"
      }`}
    >
      <span>
        <span className="block text-base font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      {selected && <Check className="size-5 shrink-0 text-primary" />}
    </button>
  );
}

function Reveal({
  slug,
  result,
  answers,
  catalog,
  onRestart,
}: {
  slug: string;
  result: FunnelResult;
  answers: Record<string, string>;
  catalog: Record<string, CatalogItem>;
  onRestart: () => void;
}) {
  const product = catalog[result.productHandle];
  const shopHref = `/products/${result.productHandle}?ref=${slug}`;

  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (hp.trim()) {
      setState("done"); // honeypot tripped — do nothing
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: `funnel:${slug}`,
          hp,
          metadata: { funnel: slug, answers, result: { productHandle: result.productHandle, headline: result.headline } },
        }),
      });
      if (!res.ok) throw new Error("bad status");
      trackLead(`funnel:${slug}`);
      trackEvent("lead_captured", { funnel: slug, product: result.productHandle });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="animate-fade-up text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
        <Sparkles className="size-4" /> Your match
      </p>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm">
        {product?.image && (
          <Link href={shopHref} className="relative block aspect-[4/3] w-full overflow-hidden bg-secondary">
            <Image
              src={product.image}
              alt={result.headline}
              fill
              sizes="(max-width: 640px) 100vw, 576px"
              className="object-cover"
            />
          </Link>
        )}
        <div className="p-6">
          <h1 className="font-display text-2xl font-semibold text-[hsl(var(--maroon))]">{result.headline}</h1>
          <p className="mt-1 text-sm font-semibold text-primary">{result.metric}</p>
          <p className="mt-3 text-muted-foreground">{result.blurb}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Button asChild size="lg">
              <Link href={shopHref}>
                {result.ctaLabel}
                {product ? ` · ${formatMoney(product.priceCents)}` : ""}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Email capture — never gates shopping; lead is stored server-side first. */}
      <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5 text-left">
        {state === "done" ? (
          <p className="text-sm font-medium text-primary">
            You&rsquo;re in — check your inbox for <strong>10% off your first box</strong>. 🍪
          </p>
        ) : (
          <form onSubmit={capture} className="space-y-3">
            <p className="text-sm font-semibold">Want 10% off your first box?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <Button type="submit" disabled={state === "loading"}>
                {state === "loading" ? "Sending…" : "Send my 10% off"}
              </Button>
            </div>
            {/* Honeypot — hidden from users, catches bots. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            {state === "error" && (
              <p className="text-sm text-destructive">Something went wrong — try again.</p>
            )}
            <p className="text-xs text-muted-foreground">No spam, just cookies. Unsubscribe anytime.</p>
          </form>
        )}
      </div>

      <button onClick={onRestart} className="mt-6 text-sm text-muted-foreground underline-offset-2 hover:underline">
        Start over
      </button>
    </div>
  );
}
