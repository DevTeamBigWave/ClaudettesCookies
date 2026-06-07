import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { PromotionsManager } from "@/components/admin/promotions-manager";
import type { Discount } from "@/types/db";

export default async function PromotionsPage() {
  const db = createAdminClient();
  const { data: discounts } = await db
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Promotions" description="Discount codes customers can apply at checkout." />
      <PromotionsManager discounts={(discounts as Discount[]) ?? []} />
    </>
  );
}
