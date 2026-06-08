"use client";

import { useEffect } from "react";

/** Opens the browser print dialog once the packing slip has rendered. */
export function AutoPrint() {
  useEffect(() => {
    // Defer to the next frame so fonts/layout settle before the dialog opens.
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/** Manual reprint control (hidden on the printout itself). */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full border border-black px-5 py-2 text-sm font-semibold"
    >
      Print again
    </button>
  );
}
