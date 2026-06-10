import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/shop/clear-cart-on-mount";

export const metadata = { title: "Order confirmed" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; pickup?: string }>;
}) {
  const { order, pickup } = await searchParams;
  const isPickup = pickup === "1";

  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <ClearCartOnMount />
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="mt-6 font-display text-4xl font-semibold">Thank you!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Your order is in and the oven&rsquo;s on. We&rsquo;ve emailed your receipt
        {order ? <> for order <span className="font-semibold">#{order}</span></> : null}.{" "}
        {isPickup
          ? "We'll email you the moment it's baked and ready to pick up."
          : "You'll get tracking the moment it ships."}
      </p>
      <Button asChild className="mt-8">
        <Link href="/shop">Keep shopping</Link>
      </Button>
    </div>
  );
}
