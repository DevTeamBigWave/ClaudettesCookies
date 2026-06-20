import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Money-Back Guarantee",
  description:
    "If you're not in love with your Claudette's Cookies box, we'll make it right with a refund. How our money-back guarantee, replacements, and cancellations work.",
  alternates: { canonical: "/returns" },
};

const UPDATED = "June 20, 2026";
const SUPPORT = "hello@claudettescookies.shop";

export default function ReturnsPage() {
  return (
    <div className="container-prose py-16">
      <h1 className="font-display text-4xl font-semibold text-[hsl(var(--maroon))]">
        Returns &amp; Money-Back Guarantee
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-foreground/90 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl font-semibold">Our money-back guarantee</h2>
          <p className="mt-3">
            We bake every box to order with real ingredients, and we want you to love it. If
            you&rsquo;re <strong>not in love with your cookies</strong>, let us know and
            we&rsquo;ll make it right &mdash; with a replacement or a full refund. No cookie should
            ever disappoint.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">How to make a claim</h2>
          <p className="mt-3">
            Email us at{" "}
            <a href={`mailto:${SUPPORT}`} className="text-primary underline">
              {SUPPORT}
            </a>{" "}
            within <strong>7 days of delivery</strong> with your order number and a quick note
            about what went wrong. A photo helps us improve, but isn&rsquo;t required.
          </p>
          <p className="mt-3">
            Because our cookies are perishable, <strong>you don&rsquo;t need to ship anything
            back</strong> &mdash; please don&rsquo;t mail food to us. We&rsquo;ll sort out a
            replacement or refund over email.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Refunds</h2>
          <p className="mt-3">
            Approved refunds are issued to your original payment method through our payment
            processor, Stripe. Most refunds appear within <strong>5&ndash;10 business days</strong>,
            depending on your bank or card issuer. Original shipping charges are refunded when an
            order arrives damaged, incorrect, or doesn&rsquo;t arrive at all.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Damaged, wrong, or lost orders</h2>
          <p className="mt-3">
            If your order arrives damaged or incorrect, or tracking shows it lost in transit,
            email us within 7 days and we&rsquo;ll send a replacement or refund at no cost to you.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Cancellations &amp; changes</h2>
          <p className="mt-3">
            Since boxes are baked to order, please request any changes or cancellations as soon as
            possible. We can usually cancel or modify an order any time before it has been baked
            and shipped &mdash; just email us and we&rsquo;ll do our best to catch it in time.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Gift cards</h2>
          <p className="mt-3">
            Gift cards are non-refundable and can&rsquo;t be redeemed for cash except where
            required by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Questions?</h2>
          <p className="mt-3">
            We&rsquo;re happy to help &mdash; reach us any time at{" "}
            <a href={`mailto:${SUPPORT}`} className="text-primary underline">
              {SUPPORT}
            </a>
            . See also our{" "}
            <Link href="/terms" className="text-primary underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
