"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GiftCardPreview } from "@/components/shop/gift-card-preview";
import { cn, formatMoney } from "@/lib/utils";

const PRESETS = [2500, 5000, 7500, 10000];

export default function GiftCardsPage() {
  const [amount, setAmount] = useState(5000);
  const [form, setForm] = useState({
    purchaserEmail: "",
    recipientEmail: "",
    recipientName: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gift-cards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: amount, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="container grid gap-12 py-16 md:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Gift Cards</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-tight">
          Give the ritual.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          The easiest way to send someone four flavors and zero compromise. Delivered by
          email, redeemable on anything in the shop, and it never crumbles in transit.
        </p>
        <GiftCardPreview
          amount={amount}
          recipientName={form.recipientName.trim() || undefined}
          className="mt-8 max-w-md"
        />
      </div>

      <form onSubmit={buy} className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Choose an amount</h2>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={cn(
                "rounded-xl border px-2 py-3 text-sm font-semibold transition-colors",
                amount === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary",
              )}
            >
              {formatMoney(p)}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="purchaserEmail">Your email</Label>
            <Input
              id="purchaserEmail"
              type="email"
              required
              className="mt-1.5"
              value={form.purchaserEmail}
              onChange={(e) => setForm({ ...form, purchaserEmail: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="recipientName">Recipient name</Label>
            <Input
              id="recipientName"
              required
              className="mt-1.5"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="recipientEmail">Recipient email</Label>
            <Input
              id="recipientEmail"
              type="email"
              required
              className="mt-1.5"
              value={form.recipientEmail}
              onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              className="mt-1.5"
              maxLength={300}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
          {loading ? "Redirecting…" : `Buy gift card · ${formatMoney(amount)}`}
        </Button>
      </form>
    </div>
  );
}
