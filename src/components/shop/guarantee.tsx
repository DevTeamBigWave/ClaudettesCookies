import { ShieldCheck, Truck, Sparkles } from "lucide-react";

/**
 * Satisfaction guarantee + trust badges. Reduces purchase risk for first-time
 * ad traffic. Copy is intentionally a "we'll make it right" promise rather than
 * a literal returns policy (cookies are perishable) — adjust the wording/terms
 * to match how you actually want to honor it.
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
          <span className="font-semibold text-foreground">Happiness guarantee.</span>{" "}
          Not thrilled with your box? Email us and we&rsquo;ll make it right.
        </p>
      </div>
    );
  }

  const items = [
    { icon: ShieldCheck, title: "Happiness guarantee", copy: "Not thrilled? We'll make it right." },
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
