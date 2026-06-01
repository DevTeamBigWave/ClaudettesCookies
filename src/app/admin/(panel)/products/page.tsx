import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export default async function AdminProducts() {
  const db = createAdminClient();
  const { data: products } = await db
    .from("products")
    .select("id, title, status, price_cents, product_variants(id, inventory_qty)")
    .order("position");

  return (
    <>
      <PageHeader title="Products" description="Your catalog and live inventory." />
      <DataTable columns={["Product", "Status", "Price", "In stock", ""]}>
        {(products ?? []).map((p) => {
          const variant = (p.product_variants as { id: string; inventory_qty: number }[])?.[0];
          const stock = (p.product_variants as { inventory_qty: number }[])?.reduce(
            (s, v) => s + v.inventory_qty,
            0,
          );
          return (
            <tr key={p.id} className="hover:bg-secondary/40">
              <td className="px-4 py-3 font-medium">{p.title}</td>
              <td className="px-4 py-3"><StatusPill status={p.status} /></td>
              <td className="px-4 py-3">{formatMoney(p.price_cents)}</td>
              <td className="px-4 py-3">{stock ?? 0}</td>
              <td className="px-4 py-3 text-right">
                <ProductRowActions
                  productId={p.id}
                  status={p.status}
                  variantId={variant?.id}
                  inventory={variant?.inventory_qty ?? 0}
                />
              </td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
