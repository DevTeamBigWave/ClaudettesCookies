"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setProductStatus, updateVariantInventory } from "@/app/admin/(panel)/actions";

export function ProductRowActions({
  productId,
  status,
  variantId,
  inventory,
}: {
  productId: string;
  status: "active" | "draft" | "archived";
  variantId?: string;
  inventory: number;
}) {
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(inventory);

  return (
    <div className="flex items-center justify-end gap-2">
      {variantId && (
        <form
          action={() => start(() => updateVariantInventory(variantId, qty))}
          className="flex items-center gap-1"
        >
          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-8 w-20 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Save
          </Button>
        </form>
      )}
      <Button
        size="sm"
        variant={status === "active" ? "ghost" : "secondary"}
        disabled={pending}
        onClick={() =>
          start(() => setProductStatus(productId, status === "active" ? "draft" : "active"))
        }
      >
        {status === "active" ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}
