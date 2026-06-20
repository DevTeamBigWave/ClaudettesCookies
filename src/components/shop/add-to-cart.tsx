"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/store/cart";
import { trackAddToCart } from "@/lib/analytics";

export function AddToCart({
  line,
}: {
  line: Omit<CartLine, "quantity" | "key">;
}) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        add(line);
        trackAddToCart(
          [
            {
              item_id: line.variantId,
              item_name: line.title,
              item_variant: line.variantTitle || undefined,
              price: line.unitPriceCents / 100,
              quantity: 1,
            },
          ],
          line.unitPriceCents,
        );
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check /> Added to bag
        </>
      ) : (
        <>
          <ShoppingBag /> Add to bag
        </>
      )}
    </Button>
  );
}
