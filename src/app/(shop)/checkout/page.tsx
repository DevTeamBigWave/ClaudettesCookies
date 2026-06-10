"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement,
  ShippingAddressElement,
  ExpressCheckoutElement,
} from "@stripe/react-stripe-js/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-client";
import { formatMoney } from "@/lib/utils";

export default function CheckoutPage() {
  const { lines, subtotalCents } = useCart();
  const [mounted, setMounted] = useState(false);

  // Contact + promo live in the parent so they render instantly (no waiting on
  // Stripe) and survive the provider re-mounting when the session is recreated.
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState("");

  const [pickup, setPickup] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  async function createSession(opts: { pickup: boolean; discountCode?: string }) {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: opts.pickup,
          discountCode: opts.discountCode || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            composition: l.composition?.map((p) => ({ handle: p.handle, qty: p.qty })),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}) as { clientSecret?: string; orderNumber?: number; error?: string });
      if (!res.ok) throw new Error(data.error ?? `Checkout failed (${res.status})`);
      if (!data.clientSecret) throw new Error("Could not start checkout.");
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCreating(false);
    }
  }

  // Create the session once, as soon as the cart is known.
  const created = useRef(false);
  useEffect(() => {
    if (mounted && lines.length > 0 && !created.current) {
      created.current = true;
      createSession({ pickup: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lines.length]);

  async function changePickup(next: boolean) {
    if (next === pickup || creating) return;
    setPickup(next);
    setClientSecret(null);
    await createSession({ pickup: next, discountCode: promo });
  }

  async function applyPromo() {
    if (creating) return;
    setClientSecret(null);
    await createSession({ pickup, discountCode: promo });
  }

  if (!mounted) return <div className="container max-w-2xl py-14" />;

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="container flex max-w-2xl flex-col items-center py-24 text-center">
        <p className="text-5xl">🍪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Checkout is briefly unavailable</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          We&rsquo;re having a momentary issue taking payment. Please try again shortly, or email{" "}
          <a href="mailto:hello@claudettescookies.shop" className="text-primary hover:underline">
            hello@claudettescookies.shop
          </a>
          .
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/cart">Back to bag</Link>
        </Button>
      </div>
    );
  }

  if (lines.length === 0) {
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
    <div className="container max-w-2xl space-y-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Checkout</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Ship vs pickup — instant */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: false, label: "Ship it", hint: "FedEx to your door" },
          { v: true, label: "Pick up", hint: "Free · in person" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            disabled={creating}
            onClick={() => changePickup(opt.v)}
            className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
              pickup === opt.v ? "border-primary bg-secondary" : "border-border"
            }`}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className="block text-xs text-muted-foreground">{opt.hint}</span>
          </button>
        ))}
      </div>

      {/* Contact — instant */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoney(subtotalCents())}</span>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email</label>
          <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
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
            {pickup ? "So we can reach you when your order is ready." : "Required by the carrier for delivery updates."}
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Promo code</label>
          <div className="flex gap-2">
            <Input placeholder="WELCOME10" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
            <Button type="button" variant="outline" disabled={creating || !promo} onClick={applyPromo}>
              Apply
            </Button>
          </div>
        </div>
      </section>

      {/* Stripe elements — load once the session is ready (form above stays instant) */}
      {clientSecret ? (
        <CheckoutElementsProvider
          key={clientSecret}
          stripe={getStripe()}
          options={{
            clientSecret,
            elementsOptions: { appearance: { theme: "stripe", variables: { borderRadius: "12px" } } },
          }}
        >
          <PaymentArea pickup={pickup} orderNumber={orderNumber} email={email} phone={phone} />
        </CheckoutElementsProvider>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {creating ? "Loading secure payment…" : "…"}
        </div>
      )}
    </div>
  );
}

function PaymentArea(props: {
  pickup: boolean;
  orderNumber: number | null;
  email: string;
  phone: string;
}) {
  const result = useCheckoutElements();
  const co = result.type === "success" ? result.checkout : null;

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [addressComplete, setAddressComplete] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  // Apply email/phone to the session (debounced) whenever they change. Covers
  // both the initial values and edits, and re-applies after a session recreate.
  const emailValid = /\S+@\S+\.\S+/.test(props.email);
  const phoneValid = props.phone.replace(/\D/g, "").length >= 10;
  useEffect(() => {
    if (!co || !emailValid) return;
    const t = setTimeout(() => co.updateEmail(props.email).catch(() => {}), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [co, props.email]);
  useEffect(() => {
    if (!co || !phoneValid) return;
    const t = setTimeout(() => co.updatePhoneNumber(props.phone).catch(() => {}), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [co, props.phone]);

  if (result.type === "loading") {
    return <p className="text-sm text-muted-foreground">Loading secure payment…</p>;
  }
  if (result.type === "error") {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }
  const checkout = result.checkout;

  const totalLabel = checkout.total?.total?.amount ?? "";
  const selectedId = checkout.shipping?.shippingOption?.id ?? null;
  // Contact can come from our fields OR Link / a wallet (set on the session).
  const hasEmail = Boolean(checkout.email) || emailValid;
  const hasPhone = props.pickup || Boolean(checkout.phoneNumber) || phoneValid;
  const canPay =
    hasEmail &&
    hasPhone &&
    (props.pickup || addressComplete) &&
    paymentComplete &&
    checkout.shippingOptions.length > 0 &&
    selectedId !== null &&
    !paying;

  // Tell the customer exactly what's blocking Pay (otherwise a disabled button
  // with no reason is baffling — e.g. Link fills everything but the phone).
  let payHint: string | null = null;
  if (!paying) {
    if (!hasEmail) payHint = "Enter your email above to continue.";
    else if (!hasPhone) payHint = "Add a phone number above — the carrier requires it for shipping.";
    else if (!props.pickup && !addressComplete) payHint = "Complete your shipping address.";
    else if (!paymentComplete) payHint = "Add your payment details below.";
  }

  const returnUrl = `${window.location.origin}/checkout/success?order=${props.orderNumber ?? ""}${
    props.pickup ? "&pickup=1" : ""
  }`;

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      if (emailValid) await checkout.updateEmail(props.email);
      if (phoneValid) await checkout.updatePhoneNumber(props.phone);
      const res = await checkout.confirm({ returnUrl });
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
      {/* One-tap express checkout (Apple Pay / Google Pay / Link) — fills contact
          (+ address for shipping) and pays in one tap. */}
      <div>
        <ExpressCheckoutElement
          onReady={(e) => setExpressReady(Boolean(e.availablePaymentMethods))}
          onConfirm={async (event) => {
            setPayError(null);
            try {
              const res = await checkout.confirm({ expressCheckoutConfirmEvent: event, returnUrl });
              if (res.type === "error") setPayError(res.error.message);
            } catch (err) {
              setPayError(err instanceof Error ? err.message : "Payment could not be completed.");
            }
          }}
        />
        {expressReady && (
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or pay below{" "}
            <span className="h-px flex-1 bg-border" />
          </div>
        )}
      </div>

      {/* Address or pickup notice */}
      {props.pickup ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Local pickup</h2>
          <p className="text-sm text-muted-foreground">
            No shipping — we&rsquo;ll contact you within 4 hours with pickup details.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Shipping address</h2>
          <ShippingAddressElement
            options={{ display: { name: "full" } }}
            onChange={(e) => setAddressComplete(e.complete)}
          />
        </section>
      )}

      {/* Shipping method */}
      <section className={`rounded-2xl border border-border bg-card p-6 ${props.pickup ? "hidden" : ""}`}>
        <h2 className="mb-4 font-display text-lg font-semibold">Shipping method</h2>
        <div className="space-y-2">
          {checkout.shippingOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="shipping-tier"
                  checked={selectedId === opt.id}
                  onChange={() => checkout.updateShippingOption(opt.id)}
                />
                <span className="font-medium">{opt.displayName}</span>
              </span>
              <span className="font-medium">{opt.amount}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Payment (wallets hidden here — they're in the express button above) */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Payment</h2>
        <PaymentElement
          options={{ wallets: { applePay: "never", googlePay: "never" } }}
          onChange={(e) => setPaymentComplete(e.complete)}
        />
      </section>

      {/* Total + Pay */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">{totalLabel}</span>
        </div>
        {payError && <p className="mb-3 text-sm text-destructive">{payError}</p>}
        <Button className="w-full" size="lg" onClick={pay} disabled={!canPay}>
          {paying ? "Processing…" : `Pay ${totalLabel}`.trim()}
        </Button>
        {payHint && !canPay ? (
          <p className="mt-3 text-center text-xs font-medium text-primary">{payHint}</p>
        ) : (
          <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout powered by Stripe.</p>
        )}
      </div>
    </div>
  );
}
