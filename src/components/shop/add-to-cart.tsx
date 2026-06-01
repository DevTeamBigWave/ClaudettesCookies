"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/store/cart";

export function AddToCart({ line, soldOut }: { line: Omit<CartLine, "quantity">; soldOut: boolean }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  if (soldOut) {
    return (
      <Button size="lg" disabled className="w-full">
        Sold Out
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        add(line);
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
