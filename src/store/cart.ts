"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One chosen flavor inside a Build-Your-Own box. */
export interface BoxPick {
  handle: string;
  name: string;
  qty: number;
}

export interface CartLine {
  /** Stable line identity. Equals variantId for normal items; for a custom box
   *  it also encodes the composition, so two different mixes stay separate. */
  key: string;
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  variantTitle: string;
  unitPriceCents: number;
  image: string | null;
  quantity: number;
  composition?: BoxPick[];
}

/** Identity for a line: variantId alone, or variantId + a composition signature. */
export function lineKey(line: { variantId: string; composition?: BoxPick[] }): string {
  if (!line.composition?.length) return line.variantId;
  const sig = line.composition
    .map((p) => `${p.handle}x${p.qty}`)
    .sort()
    .join("|");
  return `${line.variantId}:${sig}`;
}

/** Itemized totals for an order — shown at checkout, payment, and confirmation. */
export interface OrderBreakdown {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

/** Snapshot of a just-placed order, stashed so the success page can show the
 *  breakdown even though the cart is cleared on arrival. */
export interface LastOrder {
  orderNumber: number | null;
  pickup: boolean;
  items: { title: string; variantTitle: string; quantity: number; totalCents: number }[];
  breakdown: OrderBreakdown;
}

interface CartState {
  lines: CartLine[];
  /** Promo code, persisted so a crash / re-render / navigation can't wipe it. */
  promoCode: string;
  setPromoCode: (code: string) => void;
  /** Last placed order, for the confirmation page (read once, then cleared). */
  lastOrder: LastOrder | null;
  setLastOrder: (order: LastOrder) => void;
  clearLastOrder: () => void;
  add: (line: Omit<CartLine, "quantity" | "key">, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
}

/**
 * Cart lives entirely in the browser (localStorage). Prices shown here are for
 * display only — the server re-prices every line from the DB at checkout, so a
 * tampered cart can never change what a customer is charged.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promoCode: "",
      setPromoCode: (code) => set({ promoCode: code }),
      lastOrder: null,
      setLastOrder: (order) => set({ lastOrder: order }),
      clearLastOrder: () => set({ lastOrder: null }),
      add: (line, qty = 1) =>
        set((state) => {
          const key = lineKey(line);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + qty } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key, quantity: qty }] };
        }),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
        })),
      // A completed/emptied cart also drops the promo so it can't bleed into a
      // later, unrelated order. The lastOrder snapshot is cleared separately.
      clear: () => set({ lines: [], promoCode: "" }),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: () =>
        get().lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0),
    }),
    {
      name: "claudettes-cart",
      // Carts saved before line keys existed need one backfilled on load.
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { lines?: CartLine[] } | undefined;
        if (state?.lines) {
          state.lines = state.lines.map((l) => ({ ...l, key: l.key ?? lineKey(l) }));
        }
        return state as CartState;
      },
    },
  ),
);
