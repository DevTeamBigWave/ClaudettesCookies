import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLabelProviderConfigured } from "@/lib/labels";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { LabelActions } from "@/components/admin/label-actions";
import { FulfillmentActions } from "@/components/admin/fulfillment-actions";
import { formatMoney, formatDate, boxContentsLines } from "@/lib/utils";

type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type ShippingAddress = { name?: string | null; phone?: string | null; address?: StripeAddress } | null;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();

  const { data: items } = await db
    .from("order_items")
    .select("title, variant_title, quantity, total_cents")
    .eq("order_id", id);

  const isPickup = order.fulfillment_type === "pickup";
  const ship = order.shipping_address as ShippingAddress;
  const addr = ship?.address;
  const hasAddress = Boolean(addr?.line1 && addr.city && addr.state && addr.postal_code);
  const shipConfigured = isLabelProviderConfigured();
  const isPaid = order.status === "paid" || order.status === "fulfilled";

  const canGenerate = isPaid && shipConfigured && hasAddress;
  const reason = !isPaid
    ? "A label can be generated once the order is paid."
    : !hasAddress
      ? "No complete shipping address on this order yet."
      : !shipConfigured
        ? "Set SHIPPO_API_TOKEN (or the FEDEX_* vars) to enable label printing."
        : undefined;

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <PageHeader
        title={`Order #${order.order_number}`}
        description={`${order.email} · ${formatDate(order.created_at)}`}
        action={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <a href={`/admin/packing-slip/${order.id}`} target="_blank" rel="noopener noreferrer">
                <FileText className="size-4" /> Packing slip
              </a>
            </Button>
            <StatusPill status={order.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items + totals */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-border">
              {(items ?? []).map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    {boxContentsLines(it.variant_title).length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {boxContentsLines(it.variant_title).map((line, j) => (
                          <li key={j}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-muted-foreground">× {it.quantity}</p>
                    <p className="font-medium">{formatMoney(it.total_cents)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal_cents)} />
              {order.discount_cents > 0 && (
                <Row label={`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`} value={`–${formatMoney(order.discount_cents)}`} />
              )}
              <Row label={`Shipping${order.shipping_method ? ` · ${order.shipping_method}` : ""}`} value={formatMoney(order.shipping_cents)} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.total_cents)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Shipping + label */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">
              {isPickup ? "Pickup" : "Shipping address"}
            </h2>
            {isPickup ? (
              <p className="text-sm text-muted-foreground">
                🏠 Local pickup{ship?.phone ? ` · ${ship.phone}` : ""}
              </p>
            ) : hasAddress ? (
              <address className="text-sm not-italic leading-relaxed text-muted-foreground">
                {ship?.name && <span className="block font-medium text-foreground">{ship.name}</span>}
                {addr?.line1}
                {addr?.line2 ? `, ${addr.line2}` : ""}
                <br />
                {addr?.city}, {addr?.state} {addr?.postal_code}
                <br />
                {addr?.country}
                {ship?.phone && <span className="block">{ship.phone}</span>}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping address recorded.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Fulfillment</h2>
              <StatusPill status={order.fulfillment} />
            </div>
            <FulfillmentActions
              orderId={order.id}
              fulfillment={order.fulfillment}
              pickup={isPickup}
              trackingNumber={order.tracking_number}
              carrier={order.shipping_carrier}
              shippedAt={order.shipped_at}
              deliveryStatus={order.delivery_status}
              deliveredAt={order.delivered_at}
            />
          </div>

          {!isPickup && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Shipping label</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {order.shipping_carrier && order.shipping_carrier !== "Flat" ? order.shipping_carrier : "USPS / FedEx via Shippo"}
                {order.shipping_service ? ` · ${order.shipping_service}` : ""}
                {order.label_generated_at ? ` · printed ${formatDate(order.label_generated_at)}` : ""}
              </p>
              <LabelActions
                orderId={order.id}
                hasLabel={Boolean(order.label_path)}
                trackingNumber={order.tracking_number}
                qrCodeUrl={order.label_qr_url}
                canGenerate={canGenerate}
                reason={reason}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
