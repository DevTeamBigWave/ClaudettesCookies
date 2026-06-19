"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart, type BoxPick } from "@/store/cart";
import type { Flavor } from "@/lib/data/products";

interface BoxInfo {
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  unitPriceCents: number;
  image: string | null;
}

export function BuildYourOwn({
  flavors,
  box,
  boxSize,
}: {
  flavors: Flavor[];
  box: BoxInfo;
  boxSize: number;
}) {
  const add = useCart((s) => s.add);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const total = useMemo(() => Object.values(counts).reduce((n, c) => n + c, 0), [counts]);
  const remaining = boxSize - total;
  const complete = total === boxSize;

  function bump(handle: string, delta: number) {
    setAdded(false);
    setCounts((prev) => {
      const prevTotal = Object.values(prev).reduce((n, c) => n + c, 0);
      // Never let the box exceed its size.
      if (delta > 0 && prevTotal >= boxSize) return prev;
      const next = Math.max(0, (prev[handle] ?? 0) + delta);
      return next === 0 ? omit(prev, handle) : { ...prev, [handle]: next };
    });
  }

  function addBox() {
    if (!complete) return;
    const composition: BoxPick[] = flavors
      .filter((f) => (counts[f.handle] ?? 0) > 0)
      .map((f) => ({ handle: f.handle, name: f.name, qty: counts[f.handle] }));
    // A box that's entirely one flavor is named after that flavor (matches what
    // the server records at checkout); a mix keeps the builder title + list.
    const single = composition.length === 1;
    const title = single ? composition[0].name : box.title;
    const variantTitle = single
      ? `${boxSize} cookies`
      : composition.map((p) => `${p.qty}× ${p.name}`).join(", ");

    add({
      variantId: box.variantId,
      productId: box.productId,
      handle: box.handle,
      title,
      variantTitle,
      unitPriceCents: box.unitPriceCents,
      image: box.image,
      composition,
    });
    setCounts({});
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {complete ? (
            <span className="text-primary">Your box is full — {boxSize} cookies.</span>
          ) : (
            <>
              Pick {remaining} more {remaining === 1 ? "cookie" : "cookies"}
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {total}/{boxSize}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(total / boxSize) * 100}%` }}
        />
      </div>

      <ul className="mt-5 divide-y divide-border">
        {flavors.map((f) => {
          const qty = counts[f.handle] ?? 0;
          return (
            <li key={f.handle} className="flex items-center gap-3 py-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {f.image && <Image src={f.image} alt={f.name} fill className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                {f.allergens && f.allergens.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">{f.allergens.join(" · ")}</p>
                )}
              </div>
              <div className="flex items-center rounded-full border border-border">
                <button
                  type="button"
                  className="grid size-8 place-items-center disabled:opacity-30"
                  onClick={() => bump(f.handle, -1)}
                  disabled={qty === 0}
                  aria-label={`Remove one ${f.name}`}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-medium">{qty}</span>
                <button
                  type="button"
                  className="grid size-8 place-items-center disabled:opacity-30"
                  onClick={() => bump(f.handle, 1)}
                  disabled={total >= boxSize}
                  aria-label={`Add one ${f.name}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        size="lg"
        className={cn("mt-6 w-full")}
        onClick={addBox}
        disabled={!complete}
      >
        {added ? (
          <>
            <Check /> Added to bag
          </>
        ) : complete ? (
          <>
            <ShoppingBag /> Add box to bag
          </>
        ) : (
          <>Pick {remaining} more to add</>
        )}
      </Button>
    </div>
  );
}

function omit(obj: Record<string, number>, key: string): Record<string, number> {
  const { [key]: _drop, ...rest } = obj;
  return rest;
}
