"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Storefront error boundary. Catches any client/render exception in the (shop)
 * segment so a single broken page degrades to a friendly retry instead of the
 * raw "client-side exception" white screen. The cart lives in localStorage, so
 * it survives a reset.
 */
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront error:", error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <p className="text-5xl">🍪</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We hit a snag loading this page. Your bag is safe — give it another try.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/cart">Back to bag</Link>
        </Button>
      </div>

      {/* Temporary: surfaces the real error so it can be screenshotted while we
          track down the checkout crash. Safe to remove once resolved. */}
      {(error?.message || error?.digest) && (
        <details className="mt-8 w-full max-w-md text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">Error details</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs [overflow-wrap:anywhere]">
{error?.message || "(no message)"}{error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        </details>
      )}
    </div>
  );
}
