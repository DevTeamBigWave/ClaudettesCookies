"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement,
  ShippingAddressElement,
} from "@stripe/react-stripe-js/checkout";
import type { StripeAddressElementChangeEvent } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/store/cart";
import { getStripe } from "@/lib/stripe-client";
import { formatMoney } from "@/lib/utils";

// Mirrors the placeholder display_name set in /api/checkout when the session is
// created (before the customer's address resolves real shipping tiers).
const PLACEHOLDER_SHIPPING = "Enter address for shipping";

export default function CheckoutPage() {
  const { lines, subtotalCents } = useCart();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    if (!email) {
      setError("Enter your email to continue.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          discountCode: code || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            composition: l.composition?.map((p) => ({ handle: p.handle, qty: p.qty })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCreating(false);
    }
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

/** The address → live shipping tiers → payment flow, inside the Checkout SDK. */
function PaymentArea({ orderNumber }: { orderNumber: number | null }) {
  const result = useCheckoutElements();
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Re-quote shipping on our server whenever the address is complete. Wrapped in
  // runServerUpdate so the SDK refreshes the session (and its shippingOptions).
  const checkout = result.type === "success" ? result.checkout : null;
  const onAddressChange = useCallback(
    async (event: StripeAddressElementChangeEvent) => {
      if (!checkout || !event.complete) return;
      setQuoting(true);
      setShippingError(null);
      try {
        const update = await checkout.runServerUpdate(async () => {
          const res = await fetch("/api/checkout/shipping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkoutSessionId: checkout.id,
              shippingDetails: { name: event.value.name, address: event.value.address },
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Could not get shipping rates");
          }
        });
        if (update.type === "error") setShippingError(update.error.message);
      } catch (e) {
        setShippingError(e instanceof Error ? e.message : "Could not get shipping rates");
      } finally {
        setQuoting(false);
      }
    },
    [checkout],
  );

  if (result.type === "loading") {
    return <p className="text-sm text-muted-foreground">Loading secure checkout…</p>;
  }
  if (result.type === "error") {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const co = result.checkout;
  const selectedId = co.shipping?.shippingOption.id ?? null;
  // Don't allow paying on the $0 "Enter address" placeholder — require a real
  // tier (Regular/Express/Free shipping) selected after the address resolves.
  const selectedIsReal =
    !!co.shipping && co.shipping.shippingOption.displayName !== PLACEHOLDER_SHIPPING;
  const canPay = co.shippingOptions.length > 0 && selectedId !== null && selectedIsReal && !paying;

  async function pay() {
    setPaying(true);
    setPayError(null);
    const res = await co.confirm({
      returnUrl: `${window.location.origin}/checkout/success?order=${orderNumber ?? ""}`,
    });
    if (res.type === "error") {
      setPayError(res.error.message);
      setPaying(false);
    }
    // On success the SDK redirects to returnUrl.
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Shipping address</h2>
        <ShippingAddressElement options={{ display: { name: "full" } }} onChange={onAddressChange} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Shipping method</h2>
        {quoting && <p className="text-sm text-muted-foreground">Getting live rates…</p>}
        {shippingError && <p className="text-sm text-destructive">{shippingError}</p>}
        {!quoting && co.shippingOptions.length === 0 && !shippingError && (
          <p className="text-sm text-muted-foreground">
            Enter your address above to see Regular and Express options.
          </p>
        )}
        <div className="space-y-2">
          {co.shippingOptions
            .filter((opt) => opt.displayName !== PLACEHOLDER_SHIPPING)
            .map((opt) => (
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
        <PaymentElement />
      </section>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">{co.total.total.amount}</span>
        </div>
        {payError && <p className="mb-3 text-sm text-destructive">{payError}</p>}
        <Button className="w-full" size="lg" onClick={pay} disabled={!canPay}>
          {paying ? "Processing…" : `Pay ${co.total.total.amount}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout powered by Stripe.
        </p>
      </div>
    </div>
  );
}
