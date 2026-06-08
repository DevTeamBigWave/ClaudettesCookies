"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Admin control for generating / downloading a FedEx shipping label for an order.
 * Generating calls the Ship API server-side (creating a real shipment) and stores
 * the PDF; download streams it back through a signed URL.
 */
export function LabelActions({
  orderId,
  hasLabel,
  trackingNumber,
  canGenerate,
  reason,
}: {
  orderId: string;
  hasLabel: boolean;
  trackingNumber: string | null;
  canGenerate: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {hasLabel ? "Regenerate label" : "Generate FedEx label"}
        </Button>
        {hasLabel && (
          <Button asChild variant="outline">
            <a href={`/api/admin/orders/${orderId}/label`} target="_blank" rel="noopener noreferrer">
              <FileDown className="size-4" /> Download label
            </a>
          </Button>
        )}
      </div>
      {trackingNumber && (
        <p className="text-sm text-muted-foreground">
          Tracking: <span className="font-mono font-medium text-foreground">{trackingNumber}</span>
        </p>
      )}
      {!canGenerate && reason && <p className="text-sm text-muted-foreground">{reason}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
