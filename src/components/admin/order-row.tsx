"use client";

import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/admin/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export interface OrderRowData {
  id: string;
  order_number: number;
  email: string;
  status: string;
  fulfillment: string;
  shipping_method: string | null;
  tracking_number: string | null;
  total_cents: number;
  created_at: string;
}

/** A clickable orders-table row that navigates to the order detail page. */
export function OrderRow({ order }: { order: OrderRowData }) {
  const router = useRouter();
  const href = `/admin/orders/${order.id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer hover:bg-secondary/40"
    >
      <td className="px-4 py-3 font-medium">
        {/* Real link so keyboard users can tab to it; click is handled by the row. */}
        <a href={href} onClick={(e) => e.preventDefault()} className="hover:text-primary">
          #{order.order_number}
        </a>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{order.email}</td>
      <td className="px-4 py-3">
        <StatusPill status={order.status} />
      </td>
      <td className="px-4 py-3">
        <StatusPill status={order.fulfillment} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {order.shipping_method ?? "—"}
        {order.tracking_number && <span className="block text-xs">📦 {order.tracking_number}</span>}
      </td>
      <td className="px-4 py-3 font-medium">{formatMoney(order.total_cents)}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
    </tr>
  );
}
