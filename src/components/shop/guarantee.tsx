import { ShieldCheck, Truck, Sparkles } from "lucide-react";

/**
 * Money-back guarantee + trust badges. Reduces purchase risk for first-time ad
 * traffic: if a customer isn't in love with their box, they get a refund.
 *
 * `variant="inline"` is a compact single-line badge for the product CTA area;
 * `variant="row"` is a three-up trust row for checkout / pages.
 */
export function Guarantee({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "row";
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <div
        className={`flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-sm ${className}`}
      >
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Money-back guarantee.</span>{" "}
          If you&rsquo;re not in love with your box, we&rsquo;ll refund you.
        </p>
      </div>
    );
  }

  const items = [
    { icon: ShieldCheck, title: "Money-back guarantee", copy: "Not in love? We'll refund you." },
    { icon: Truck, title: "Fresh, baked to order", copy: "Shipped fast, never off a shelf." },
    { icon: Sparkles, title: "Secure checkout", copy: "Encrypted payments via Stripe." },
  ];

  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${className}`}>
      {items.map(({ icon: Icon, title, copy }) => (
        <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
