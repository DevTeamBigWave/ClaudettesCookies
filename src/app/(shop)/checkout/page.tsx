"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement,
  ShippingAddressElement,
} from "@stripe/react-stripe-js/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-client";
import { formatMoney } from "@/lib/utils";

export default function CheckoutPage() {
  const { lines, subtotalCents } = useCart();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The cart hydrates from localStorage, which only exists in the browser.
  // Render nothing until mounted so the server HTML and the first client render
  // match — otherwise the empty-vs-populated cart causes a hydration mismatch
  // that can hard-crash the page on a direct load/refresh of /checkout.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function startCheckout() {
    setError(null);
    if (!email) {
      setError("Enter your email to continue.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a phone number — the carrier requires it for delivery.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          discountCode: code || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            composition: l.composition?.map((p) => ({ handle: p.handle, qty: p.qty })),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}) as { clientSecret?: string; orderNumber?: number; error?: string });
      if (!res.ok) throw new Error(data.error ?? `Could not start checkout (${res.status})`);
      if (!data.clientSecret) throw new Error("Could not start checkout — please try again.");
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCreating(false);
    }
  }

  if (!mounted) {
    return <div className="container max-w-2xl py-14" />;
  }

  // Embedded checkout needs the Stripe publishable key in the browser. If it's
  // not present (e.g. not set at build time), show a clear message instead of
  // crashing when Stripe.js tries to initialize.
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="container flex max-w-2xl flex-col items-center py-24 text-center">
        <p className="text-5xl">🍪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Checkout is briefly unavailable</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          We&rsquo;re having a momentary issue taking payment. Please try again shortly, or email{" "}
          <a href="mailto:hello@claudettescookies.shop" className="text-primary hover:underline">
            hello@claudettescookies.shop
          </a>{" "}
          and we&rsquo;ll sort your order out.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/cart">Back to bag</Link>
        </Button>
      </div>
    );
  }

  if (lines.length === 0 && !clientSecret) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <p className="text-5xl">🍪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-muted-foreground">Add a box before checking out.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Shop the boxes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-14">
      <h1 className="mb-8 font-display text-4xl font-semibold">Checkout</h1>

      {!clientSecret ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatMoney(subtotalCents())}</span>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Phone</label>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required by the carrier for delivery updates.
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Promo code</label>
            <Input
              placeholder="WELCOME10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" size="lg" onClick={startCheckout} disabled={creating}>
            {creating ? "Starting…" : "Continue to payment"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Shipping is calculated from your address on the next step.
          </p>
        </div>
      ) : (
        <CheckoutElementsProvider
          stripe={getStripe()}
          options={{
            clientSecret,
            elementsOptions: { appearance: { theme: "stripe", variables: { borderRadius: "12px" } } },
          }}
        >
          <PaymentArea orderNumber={orderNumber} />
        </CheckoutElementsProvider>
      )}
    </div>
  );
}

/** Address + shipping tier + payment, all in the embedded Checkout SDK. Shipping
 *  options are fixed (set when the session was created), so there's no dynamic
 *  re-quote and the address element can stay mounted through confirm(). */
function PaymentArea({ orderNumber }: { orderNumber: number | null }) {
  const result = useCheckoutElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [addressComplete, setAddressComplete] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  if (result.type === "loading") {
    return <p className="text-sm text-muted-foreground">Loading secure checkout…</p>;
  }
  if (result.type === "error") {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const co = result.checkout;
  const totalLabel = co.total?.total?.amount ?? "";
  const selectedId = co.shipping?.shippingOption?.id ?? null;
  const canPay =
    addressComplete &&
    paymentComplete &&
    co.shippingOptions.length > 0 &&
    selectedId !== null &&
    !paying;

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await co.confirm({
        returnUrl: `${window.location.origin}/checkout/success?order=${orderNumber ?? ""}`,
      });
      // On success the SDK redirects to returnUrl; on error we surface it and
      // re-enable the button. A thrown/rejected confirm is caught below so the
      // button can never get stuck on "Processing…".
      if (res.type === "error") {
        setPayError(res.error.message);
        setPaying(false);
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment could not be completed. Please try again.");
      setPaying(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Shipping address</h2>
        <ShippingAddressElement
          options={{ display: { name: "full" } }}
          onChange={(e) => setAddressComplete(e.complete)}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Shipping method</h2>
        <div className="space-y-2">
          {co.shippingOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="shipping-tier"
                  checked={selectedId === opt.id}
                  onChange={() => co.updateShippingOption(opt.id)}
                />
                <span className="font-medium">{opt.displayName}</span>
              </span>
              <span className="font-medium">{opt.amount}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Payment</h2>
        <PaymentElement onChange={(e) => setPaymentComplete(e.complete)} />
      </section>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">{totalLabel}</span>
        </div>
        {payError && <p className="mb-3 text-sm text-destructive">{payError}</p>}
        <Button className="w-full" size="lg" onClick={pay} disabled={!canPay}>
          {paying ? "Processing…" : `Pay ${totalLabel}`.trim()}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout powered by Stripe.
        </p>
      </div>
    </div>
  );
}
