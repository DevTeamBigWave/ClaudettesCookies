"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement,
} from "@stripe/react-stripe-js/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { OrderSummary } from "@/components/shop/order-summary";
import { Guarantee } from "@/components/shop/guarantee";
import { useCart, type OrderBreakdown } from "@/store/cart";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-client";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";
import { trackBeginCheckout } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";

type Rate = {
  id: string;
  carrier: string;
  service: string;
  amountCents: number;
  estimatedDays: number | null;
};

type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_ADDRESS: Address = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

export default function CheckoutPage() {
  const { lines, subtotalCents, promoCode, setPromoCode, setLastOrder } = useCart();
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // SMS marketing/notification consent — A2P requires it start unchecked.
  const [smsConsent, setSmsConsent] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);

  // Applied promo (validated server-side) + its inline feedback.
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountCents: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  // Server-computed breakdown returned when the payment session is created.
  const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);

  // Live shipping rates for the typed address (fetched on demand).
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Fire begin_checkout once, after mount, when the cart actually has items.
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current || lines.length === 0) return;
    beganCheckout.current = true;
    trackBeginCheckout(
      lines.map((l) => ({
        item_id: l.variantId,
        item_name: l.title,
        item_variant: l.variantTitle || undefined,
        price: l.unitPriceCents / 100,
        quantity: l.quantity,
      })),
      subtotalCents(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  const sub = subtotalCents();
  const appliedDiscountCents = promoApplied?.discountCents ?? 0;
  // Free shipping is judged after the discount, matching the server's priceCart.
  const freeShipping = sub - appliedDiscountCents >= FREE_SHIPPING_THRESHOLD_CENTS;

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const addressComplete = Boolean(
    address.line1.trim() &&
      address.city.trim() &&
      address.state.trim().length === 2 &&
      address.postalCode.trim().length >= 5,
  );

  const itemsPayload = useMemo(
    () =>
      lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        composition: l.composition?.map((p) => ({ handle: p.handle, qty: p.qty })),
      })),
    [lines],
  );

  // Any change to the address or cart invalidates a previously fetched quote.
  useEffect(() => {
    setRates(null);
    setSelectedRateId(null);
  }, [address.line1, address.line2, address.city, address.state, address.postalCode, pickup]);

  // Editing the cart invalidates a previously applied promo (must re-validate).
  useEffect(() => {
    setPromoApplied(null);
    setPromoMsg(null);
  }, [sub]);

  async function applyPromo() {
    const code = promoCode.trim();
    if (!code) {
      setPromoApplied(null);
      setPromoMsg(null);
      return;
    }
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email: emailValid ? email : undefined,
          items: itemsPayload.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        code?: string;
        discountCents?: number;
        message?: string;
      };
      if (data.valid) {
        setPromoApplied({ code: data.code ?? code, discountCents: data.discountCents ?? 0 });
        setPromoMsg({ ok: true, text: data.message ?? "Applied" });
      } else {
        setPromoApplied(null);
        setPromoMsg({ ok: false, text: data.message ?? "That code isn't valid for this order." });
      }
    } catch {
      setPromoApplied(null);
      setPromoMsg({ ok: false, text: "Couldn't check that code — try again." });
    } finally {
      setPromoLoading(false);
    }
  }

  function update(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: field === "state" ? value.toUpperCase().slice(0, 2) : value }));
  }

  async function fetchRates() {
    if (!addressComplete) return;
    setRatesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            name: address.name || undefined,
            line1: address.line1,
            line2: address.line2 || undefined,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            phone: phone || undefined,
          },
          items: itemsPayload.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { rates?: Rate[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not fetch shipping rates");
      const list = data.rates ?? [];
      setRates(list);
      setSelectedRateId(list[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch shipping rates");
    } finally {
      setRatesLoading(false);
    }
  }

  async function startPayment() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValid ? email : undefined,
          phone: phoneValid ? phone : undefined,
          pickup,
          discountCode: promoCode || undefined,
          ...(pickup
            ? {}
            : {
                address: {
                  name: address.name || undefined,
                  line1: address.line1,
                  line2: address.line2 || undefined,
                  city: address.city,
                  state: address.state,
                  postalCode: address.postalCode,
                },
                rateId: selectedRateId ?? undefined,
              }),
          items: itemsPayload,
          // Where this visitor came from, so the order can be attributed to a
          // source (Facebook, Google, …) in the admin dashboard.
          attribution: getAttribution(),
          // SMS opt-in consent captured at checkout (A2P consent record).
          smsConsent,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        clientSecret?: string;
        orderNumber?: number;
        sessionId?: string;
        breakdown?: OrderBreakdown;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Checkout failed (${res.status})`);
      if (!data.clientSecret) throw new Error("Could not start checkout.");
      setBreakdown(data.breakdown ?? null);
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber ?? null);
      setSessionId(data.sessionId ?? null);
      // Snapshot the order so the confirmation page can show the breakdown after
      // the cart is cleared on redirect.
      if (data.breakdown) {
        setLastOrder({
          orderNumber: data.orderNumber ?? null,
          pickup,
          items: lines.map((l) => ({
            title: l.title,
            variantTitle: l.variantTitle,
            quantity: l.quantity,
            totalCents: l.unitPriceCents * l.quantity,
          })),
          breakdown: data.breakdown,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCreating(false);
    }
  }

  function editDetails() {
    setClientSecret(null);
    setOrderNumber(null);
    setSessionId(null);
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

  // Once a session exists we hand off to Stripe for payment only (contact,
  // address, and shipping were all collected above and baked into the session).
  if (clientSecret) {
    return (
      <div className="container max-w-2xl space-y-6 py-14">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl font-semibold">Payment</h1>
          <button
            type="button"
            onClick={editDetails}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            ← Edit details
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {/* Contain the Stripe widget: if it ever throws while rendering, show a
            recoverable message here instead of crashing the whole storefront. */}
        <ErrorBoundary
          onError={(e) => console.error("Payment widget error:", e)}
          fallback={
            <section className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-4xl">🍪</p>
              <h2 className="mt-3 font-display text-xl font-semibold">
                We couldn&rsquo;t load secure payment
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Something hiccuped loading the payment form. Your bag is safe — please try again, or
                email{" "}
                <a href="mailto:hello@claudettescookies.shop" className="text-primary hover:underline">
                  hello@claudettescookies.shop
                </a>
                .
              </p>
              <Button className="mt-4" variant="outline" onClick={editDetails}>
                ← Edit details
              </Button>
            </section>
          }
        >
          <CheckoutElementsProvider
            key={clientSecret}
            stripe={getStripe()}
            options={{
              clientSecret,
              elementsOptions: { appearance: { theme: "stripe", variables: { borderRadius: "12px" } } },
            }}
          >
            <PaymentArea pickup={pickup} orderNumber={orderNumber} sessionId={sessionId} phone={phone} breakdown={breakdown} />
          </CheckoutElementsProvider>
        </ErrorBoundary>
      </div>
    );
  }

  const contactReady = emailValid && phoneValid;
  // What the primary button does next.
  const needsRates = !pickup && !freeShipping;
  const showRates = needsRates && rates !== null;
  const canContinue = pickup
    ? contactReady
    : contactReady && addressComplete && (freeShipping || (showRates && Boolean(selectedRateId)));

  // Live preview totals for the order summary (shipping is null until quoted).
  const selectedRate = rates?.find((r) => r.id === selectedRateId) ?? null;
  const previewShippingCents: number | null = pickup || freeShipping ? 0 : selectedRate?.amountCents ?? null;
  const previewTotalCents: number | null =
    previewShippingCents === null
      ? null
      : Math.max(0, sub - appliedDiscountCents) + previewShippingCents;

  return (
    <div className="container max-w-2xl space-y-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Checkout</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Ship vs pickup */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: false, label: "Ship it", hint: "Standard or Express" },
          { v: true, label: "Pick up", hint: "Free · in person" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setPickup(opt.v)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              pickup === opt.v ? "border-primary bg-secondary" : "border-border"
            }`}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className="block text-xs text-muted-foreground">{opt.hint}</span>
          </button>
        ))}
      </div>

      {/* Contact */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <OrderSummary
          subtotalCents={sub}
          discountCents={appliedDiscountCents}
          shippingCents={previewShippingCents}
          totalCents={previewTotalCents}
          discountCode={promoApplied?.code}
        />
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
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>
            I agree to receive recurring automated marketing and order text messages from
            Claudette&rsquo;s Cookies at the number provided. Consent is not a condition of purchase.
            Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP
            for help. See our{" "}
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
        <div className="space-y-2">
          <label className="block text-sm font-medium">Promo code</label>
          <div className="flex gap-2">
            <Input
              placeholder="WELCOME10"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyPromo();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!promoCode.trim() || promoLoading}
              onClick={applyPromo}
            >
              {promoLoading ? "Checking…" : "Apply"}
            </Button>
          </div>
          {promoMsg && (
            <p className={`text-xs ${promoMsg.ok ? "text-primary" : "text-destructive"}`}>
              {promoMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* Shipping address + live rates (ship only) */}
      {!pickup && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Shipping address</h2>
          <Input placeholder="Full name" autoComplete="name" value={address.name} onChange={(e) => update("name", e.target.value)} />
          <Input placeholder="Street address" autoComplete="address-line1" value={address.line1} onChange={(e) => update("line1", e.target.value)} />
          <Input placeholder="Apt, suite, etc. (optional)" autoComplete="address-line2" value={address.line2} onChange={(e) => update("line2", e.target.value)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_120px]">
            <Input placeholder="City" autoComplete="address-level2" value={address.city} onChange={(e) => update("city", e.target.value)} />
            <Input placeholder="State" autoComplete="address-level1" value={address.state} onChange={(e) => update("state", e.target.value)} />
            <Input placeholder="ZIP" inputMode="numeric" autoComplete="postal-code" value={address.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
          </div>

          {freeShipping ? (
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-primary">
              🎉 You&rsquo;ve unlocked free shipping.
            </p>
          ) : showRates ? (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium">Shipping method</p>
              {rates && rates.length > 0 ? (
                rates.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="rate"
                        checked={selectedRateId === r.id}
                        onChange={() => setSelectedRateId(r.id)}
                      />
                      <span>
                        <span className="block font-medium">
                          {r.carrier === "Flat" ? r.service : `${r.carrier} · ${r.service}`}
                        </span>
                        {r.estimatedDays != null && (
                          <span className="block text-xs text-muted-foreground">
                            Est. {r.estimatedDays} day{r.estimatedDays === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-medium">{formatMoney(r.amountCents)}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No rates returned. Please check the address.</p>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!addressComplete || ratesLoading}
              onClick={fetchRates}
            >
              {ratesLoading ? "Getting rates…" : "See shipping rates"}
            </Button>
          )}
        </section>
      )}

      {/* Continue to payment */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <Button className="w-full" size="lg" disabled={!canContinue || creating} onClick={startPayment}>
          {creating ? "Loading secure payment…" : "Continue to payment"}
        </Button>
        {!canContinue && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {!emailValid
              ? "Enter your email to continue."
              : !phoneValid
                ? "Add a phone number to continue."
                : !pickup && !addressComplete
                  ? "Enter your shipping address."
                  : needsRates && !showRates
                    ? "Get shipping rates to continue."
                    : "Select a shipping method."}
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentArea(props: {
  pickup: boolean;
  orderNumber: number | null;
  sessionId: string | null;
  phone: string;
  breakdown: OrderBreakdown | null;
}) {
  const result = useCheckoutElements();
  const co = result.type === "success" ? result.checkout : null;

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const phoneValid = props.phone.replace(/\D/g, "").length >= 10;

  // The email is already set as `customer_email` when the session is created, so
  // we must NOT call updateEmail — Stripe throws "email already set", and that
  // error would crash the whole page. Only the phone needs pushing (the session
  // enables phone_number_collection but doesn't carry a phone at create). Wrapped
  // so a contact-sync hiccup can never take down the payment step.
  const pushedRef = useRef(false);
  useEffect(() => {
    if (!co || pushedRef.current) return;
    pushedRef.current = true;
    try {
      if (phoneValid) co.updatePhoneNumber(props.phone).catch(() => {});
    } catch {
      /* non-fatal: phone is reconciled by the webhook from session data */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [co]);

  if (result.type === "loading") {
    return <p className="text-sm text-muted-foreground">Loading secure payment…</p>;
  }
  if (result.type === "error") {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }
  const checkout = result.checkout;

  const totalLabel = checkout.total?.total?.amount ?? "";
  const canPay = paymentComplete && !paying;

  const returnUrl = `${window.location.origin}/checkout/success?order=${props.orderNumber ?? ""}${
    props.pickup ? "&pickup=1" : ""
  }${props.sessionId ? `&session_id=${encodeURIComponent(props.sessionId)}` : ""}`;

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      // Email is already on the session (customer_email) — re-setting it throws.
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
      {props.pickup && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Local pickup</h2>
          <p className="text-sm text-muted-foreground">
            No shipping — we&rsquo;ll contact you within 4 hours with pickup details.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Payment</h2>
        <PaymentElement onChange={(e) => setPaymentComplete(e.complete)} />
      </section>

      <div className="rounded-2xl border border-border bg-card p-6">
        {props.breakdown ? (
          <div className="mb-4">
            <OrderSummary
              subtotalCents={props.breakdown.subtotalCents}
              discountCents={props.breakdown.discountCents}
              shippingCents={props.breakdown.shippingCents}
              totalCents={props.breakdown.totalCents}
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{totalLabel}</span>
          </div>
        )}
        {payError && <p className="mb-3 text-sm text-destructive">{payError}</p>}
        <Button className="w-full" size="lg" onClick={pay} disabled={!canPay}>
          {paying ? "Processing…" : `Pay ${totalLabel}`.trim()}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout powered by Stripe.</p>
        <Guarantee variant="row" className="mt-6" />
      </div>
    </div>
  );
}
