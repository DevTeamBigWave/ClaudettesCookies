"use client";

import { useState, useTransition } from "react";
import { Gift, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/admin/ui";
import { issueGiftCard } from "@/app/admin/(panel)/actions";

/** Admin form to issue a gift card on the spot (comp, promo, support credit). */
export function IssueGiftCardForm() {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit() {
    setError(null);
    setIssued(null);
    startTransition(async () => {
      const res = await issueGiftCard({
        amountDollars: amount,
        recipientEmail: email,
        recipientName: name,
        giftMessage: message,
        expiresAt: expiresAt || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setIssued(res.code);
      setAmount("");
      setEmail("");
      setName("");
      setMessage("");
      setExpiresAt("");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Gift className="size-5 text-primary" /> Issue a gift card
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (USD) *</label>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            placeholder="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Expires (optional)</label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Recipient email (optional)
          </label>
          <Input
            type="email"
            placeholder="friend@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Recipient name (optional)
          </label>
          <Input placeholder="Sara" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Message (optional)</label>
          <Input
            placeholder="Enjoy a box on us 🍪"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Emails the card to the recipient if you add an email — otherwise just copy the code below.
      </p>

      {error && <FormError className="mt-3">{error}</FormError>}

      {issued && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-secondary p-3 text-sm">
          <Check className="size-4 text-green-600" />
          <span>Issued</span>
          <code className="font-mono font-semibold">{issued}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(issued);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Copy className="size-3.5" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <Button className="mt-4" onClick={submit} disabled={pending || !amount}>
        {pending ? "Issuing…" : "Issue gift card"}
      </Button>
    </div>
  );
}
