"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Loader2, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/admin/ui";

/**
 * Admin control for generating / downloading a FedEx shipping label for an order.
 * Generating calls the Ship API server-side (creating a real shipment) and stores
 * the PDF; download streams it back through a signed URL.
 */
export function LabelActions({
  orderId,
  hasLabel,
  trackingNumber,
  qrCodeUrl,
  canGenerate,
  reason,
}: {
  orderId: string;
  hasLabel: boolean;
  trackingNumber: string | null;
  qrCodeUrl?: string | null;
  canGenerate: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not generate label");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate label");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button onClick={generate} disabled={loading || !canGenerate} variant={hasLabel ? "outline" : "default"}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          {hasLabel ? "Regenerate label" : "Generate shipping label"}
        </Button>
        {hasLabel && (
          <Button asChild variant="outline">
            <a href={`/api/admin/orders/${orderId}/label`} target="_blank" rel="noopener noreferrer">
              <FileDown className="size-4" /> Download label
            </a>
          </Button>
        )}
        {qrCodeUrl && (
          <Button type="button" variant="outline" onClick={() => setShowQr((v) => !v)}>
            <QrCode className="size-4" /> {showQr ? "Hide USPS QR" : "USPS QR code"}
          </Button>
        )}
      </div>

      {qrCodeUrl && showQr && (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4">
          {/* Shippo serves the QR from an unpredictable host (S3/CDN); a plain
              img avoids next/image remote-host config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeUrl}
            alt="USPS drop-off QR code"
            width={180}
            height={180}
            className="rounded-md border border-border bg-white"
          />
          <p className="max-w-xs text-xs text-muted-foreground">
            No printer? Show this QR at any USPS counter or self-service kiosk &mdash; they scan it
            and print the label for you.
          </p>
          <a
            href={qrCodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            Open / print QR full size →
          </a>
        </div>
      )}
      {trackingNumber && (
        <p className="text-sm text-muted-foreground">
          Tracking: <span className="font-mono font-medium text-foreground">{trackingNumber}</span>
        </p>
      )}
      {!canGenerate && reason && <FormError tone="muted">{reason}</FormError>}
      {error && <FormError>{error}</FormError>}
    </div>
  );
}
