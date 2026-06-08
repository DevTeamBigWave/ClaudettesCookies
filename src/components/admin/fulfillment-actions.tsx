"use client";

import { useState, useTransition } from "react";
import { Truck, CheckCircle2, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/admin/ui";
import {
  markOrderShipped,
  markOrderUnfulfilled,
  refreshDeliveryStatus,
} from "@/app/admin/(panel)/actions";
import { trackingUrl, CARRIERS } from "@/lib/tracking";
import { formatDate } from "@/lib/utils";

/**
 * Shopify-style fulfillment panel: mark an order shipped (carrier + tracking,
 * emails the customer), then track delivery status from FedEx and offer a
 * public "Track package" link. Undo flips it back to unfulfilled.
 */
export function FulfillmentActions(props: {
  orderId: string;
  fulfillment: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  deliveryStatus: string | null;
  deliveredAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const shipped = props.fulfillment === "fulfilled";

  if (!shipped) {
    return (
      <form action={markOrderShipped} className="space-y-3">
        <input type="hidden" name="orderId" value={props.orderId} />
        <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Tracking number (optional)
            </label>
            <Input
              name="trackingNumber"
              defaultValue={props.trackingNumber ?? ""}
              placeholder="e.g. 771234567890"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Carrier</label>
            <select
              name="carrier"
              defaultValue={props.carrier ?? "FedEx"}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit">
          <Truck className="size-4" /> Mark as shipped
        </Button>
        <p className="text-xs text-muted-foreground">
          Marks the order fulfilled and emails the customer their tracking link.
        </p>
      </form>
    );
  }

  const url = props.trackingNumber ? trackingUrl(props.carrier, props.trackingNumber) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
        <span>
          Shipped
          {props.shippedAt ? ` ${formatDate(props.shippedAt)}` : ""}
          {props.carrier ? ` · ${props.carrier}` : ""}
        </span>
      </div>

      {props.trackingNumber && (
        <p className="text-sm break-words">
          Tracking: <span className="font-mono">{props.trackingNumber}</span>
          {url && (
            <>
              {" · "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Track package
              </a>
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <DeliveryBadge status={props.deliveryStatus} deliveredAt={props.deliveredAt} />
        {props.trackingNumber && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await refreshDeliveryStatus(props.orderId);
                setMsg("error" in r ? r.error : `FedEx says: ${r.text}`);
              })
            }
          >
            <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} /> Check delivery
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markOrderUnfulfilled(props.orderId);
              setMsg(null);
            })
          }
        >
          <Undo2 className="size-4" /> Mark unfulfilled
        </Button>
      </div>

      {msg && <FormError tone="muted">{msg}</FormError>}
    </div>
  );
}

function DeliveryBadge({
  status,
  deliveredAt,
}: {
  status: string | null;
  deliveredAt: string | null;
}) {
  const map: Record<string, { label: string; cls: string }> = {
    delivered: { label: "Delivered", cls: "bg-green-100 text-green-800" },
    in_transit: { label: "In transit", cls: "bg-blue-100 text-blue-800" },
    exception: { label: "Delivery issue", cls: "bg-red-100 text-red-700" },
    unknown: { label: "Status unknown", cls: "bg-stone-200 text-stone-700" },
  };
  const s = status ? (map[status] ?? map.unknown) : null;
  if (!s) return null;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
      {status === "delivered" && deliveredAt ? ` · ${formatDate(deliveredAt)}` : ""}
    </span>
  );
}
