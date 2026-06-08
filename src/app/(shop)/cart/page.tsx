"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatMoney } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/pricing";

export default function CartPage() {
  const { lines, setQty, remove, subtotalCents } = useCart();

  const subtotal = subtotalCents();
  const freeEligible = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;

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
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className={freeEligible ? "font-medium text-primary" : "font-medium"}>
              {freeEligible ? "Free" : "Calculated at checkout"}
            </dd>
          </div>
          {!freeEligible && (
            <p className="text-xs text-muted-foreground">
              Free shipping on orders over {formatMoney(FREE_SHIPPING_THRESHOLD_CENTS)}. Choose Regular
              or Express at checkout.
            </p>
          )}
        </dl>

        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/checkout">Checkout · {formatMoney(subtotal)}</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout powered by Stripe.
        </p>
      </aside>
    </div>
  );
}
