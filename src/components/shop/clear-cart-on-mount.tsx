"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Empties the local cart once the order is confirmed. */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
