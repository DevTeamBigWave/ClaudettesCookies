import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, formatDate, boxContentsLines } from "@/lib/utils";
import { AutoPrint, PrintButton } from "@/components/admin/auto-print";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packing slip" };

type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type ShippingAddress = { name?: string | null; phone?: string | null; address?: StripeAddress } | null;

/**
 * Standalone, print-optimized packing slip — deliberately outside the admin
 * panel layout so there's no sidebar/header chrome on the page or the printout.
 * Lists each line's exact contents (Build Your Own boxes show their 6-cookie
 * pick from variant_title) so it doubles as a pick-and-pack sheet.
 */
export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();

  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();

  const { data: items } = await db
    .from("order_items")
    .select("title, variant_title, quantity")
    .eq("order_id", id);

  const ship = order.shipping_address as ShippingAddress;
  const addr = ship?.address;
  const totalCookies = (items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0);

  return (
    <div className="mx-auto max-w-[800px] bg-white p-10 text-black print:p-0">
      <AutoPrint />

      <style>{`@media print { @page { margin: 16mm; } body { background: #fff; } }`}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-5">
        <div>
          <p className="font-display text-3xl font-bold">Claudette&rsquo;s Cookies</p>
          <p className="text-sm">Packing Slip</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-2xl font-bold">Order #{order.order_number}</p>
          <p>{formatDate(order.created_at)}</p>
          {order.shipping_method && (
            <p className="mt-1">
              {order.shipping_carrier ?? "FedEx"} · {order.shipping_method}
            </p>
          )}
        </div>
      </div>

      {/* Ship to */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="mb-1 font-bold uppercase tracking-wide">Ship to</p>
          {addr ? (
            <address className="not-italic leading-relaxed">
              {ship?.name && <span className="block font-semibold">{ship.name}</span>}
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ""}
              <br />
              {addr.city}, {addr.state} {addr.postal_code}
              <br />
              {addr.country}
              {ship?.phone && <span className="block">{ship.phone}</span>}
            </address>
          ) : (
            <p>No shipping address on file.</p>
          )}
          <p className="mt-1">{order.email}</p>
        </div>
        <div>
          <p className="mb-1 font-bold uppercase tracking-wide">Shipment</p>
          {order.tracking_number ? (
            <p>
              Tracking: <span className="font-mono">{order.tracking_number}</span>
            </p>
          ) : (
            <p>Label not yet generated.</p>
          )}
          <p className="mt-1">{totalCookies} item(s) in this order</p>
        </div>
      </div>

      {/* Items */}
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-4">Qty</th>
            <th className="py-2 pr-4">Item</th>
            <th className="py-2">Contents</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((it, i) => (
            <tr key={i} className="border-b border-black/30 align-top">
              <td className="py-3 pr-4 font-bold">{it.quantity}×</td>
              <td className="py-3 pr-4 font-semibold">{it.title}</td>
              <td className="py-3">
                {boxContentsLines(it.variant_title).length > 0 ? (
                  <ul className="space-y-0.5">
                    {boxContentsLines(it.variant_title).map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <div className="mt-6 rounded border border-black/40 p-3 text-sm">
          <p className="font-bold">Order notes</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between border-t-2 border-black pt-4 text-sm">
        <p>Thank you for baking with Claudette&rsquo;s 🍪</p>
        <p className="font-bold">Order total: {formatMoney(order.total_cents)}</p>
      </div>

      {/* Reprint control — hidden when printing */}
      <div className="mt-8 text-center print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
