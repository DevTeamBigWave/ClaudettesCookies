"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { formatMoney } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/pricing";
import type { ShippingOption } from "@/lib/fedex";

export default function CartPage() {
  const { lines, setQty, remove, subtotalCents } = useCart();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [zip, setZip] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [source, setSource] = useState<"fedex" | "flat" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = subtotalCents();
  const freeEligible = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;
  const selectedOption = options.find((o) => o.serviceType === selected) ?? null;
  const shippingCents = freeEligible ? 0 : (selectedOption?.amountCents ?? null);

  // Fetch live rates when a full ZIP is entered (debounced). Auto-selects the
  // cheapest option so there's always a valid choice.
  const zipOk = /^\d{5}$/.test(zip.trim());
  useEffect(() => {
    if (!zipOk || lines.length === 0) {
      setOptions([]);
      setSource(null);
      setSelected(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setQuoting(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destZip: zip.trim(),
            items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Could not get rates");
        setOptions(data.options ?? []);
        setSource(data.source ?? null);
        setSelected(data.options?.[0]?.serviceType ?? null);
      } catch (e) {
        if (cancelled) return;
        setQuoteError(e instanceof Error ? e.message : "Could not get rates");
        setOptions([]);
        setSource(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, zipOk, subtotal]);

  async function checkout() {
    setError(null);
    if (!email) {
      setError("Enter your email to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          discountCode: code || undefined,
          destZip: zipOk ? zip.trim() : undefined,
          shippingServiceType: selected ?? undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            composition: l.composition?.map((p) => ({ handle: p.handle, qty: p.qty })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url; // Stripe-hosted checkout
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <p className="text-5xl">🍪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-muted-foreground">Let&rsquo;s fix that.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Shop the boxes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container grid gap-12 py-14 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-8 font-display text-4xl font-semibold">Your bag</h1>
        <ul className="divide-y divide-border">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-4 py-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {l.image && <Image src={l.image} alt={l.title} fill className="object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${l.handle}`} className="font-semibold hover:text-primary">
                  {l.title}
                </Link>
                <p className="text-sm text-muted-foreground">{l.variantTitle}</p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button
                      className="grid size-8 place-items-center"
                      onClick={() => setQty(l.key, l.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{l.quantity}</span>
                    <button
                      className="grid size-8 place-items-center"
                      onClick={() => setQty(l.key, l.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(l.key)}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="font-semibold">{formatMoney(l.unitPriceCents * l.quantity)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-semibold">Order summary</h2>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block text-sm font-medium">Promo code</label>
          <Input
            placeholder="WELCOME10"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <label className="block text-sm font-medium">Shipping ZIP</label>
          <Input
            inputMode="numeric"
            maxLength={10}
            placeholder="ZIP for live rates"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>

        {/* Live FedEx rate picker */}
        {!freeEligible && (
          <div className="mt-3 space-y-2">
            {quoting && <p className="text-xs text-muted-foreground">Getting live rates…</p>}
            {quoteError && <p className="text-xs text-destructive">{quoteError}</p>}
            {options.map((o) => (
              <label
                key={o.serviceType}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selected === o.serviceType}
                    onChange={() => setSelected(o.serviceType)}
                  />
                  <span>
                    {o.label}
                    {o.transitDays ? (
                      <span className="text-muted-foreground"> · {o.transitDays} business days</span>
                    ) : null}
                  </span>
                </span>
                <span className="font-medium">{formatMoney(o.amountCents)}</span>
              </label>
            ))}
            {source === "fedex" && options.length > 0 && (
              <p className="text-[11px] text-muted-foreground">Live FedEx rates to your ZIP.</p>
            )}
          </div>
        )}

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className={freeEligible ? "font-medium text-primary" : "font-medium"}>
              {freeEligible
                ? "Free"
                : shippingCents != null
                  ? formatMoney(shippingCents)
                  : "Enter ZIP"}
            </dd>
          </div>
          {!freeEligible && (
            <p className="text-xs text-muted-foreground">
              Free shipping on orders over {formatMoney(FREE_SHIPPING_THRESHOLD_CENTS)}.
            </p>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatMoney(subtotal + (shippingCents ?? 0))}</dd>
          </div>
        </dl>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Button className="mt-6 w-full" size="lg" onClick={checkout} disabled={loading}>
          {loading ? "Redirecting…" : `Checkout · ${formatMoney(subtotal + (shippingCents ?? 0))}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout powered by Stripe.
        </p>
      </aside>
    </div>
  );
}
