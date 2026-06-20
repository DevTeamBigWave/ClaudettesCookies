import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Claudette's Cookies website and your purchases, including orders, shipping, allergens, and our money-back guarantee.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "June 20, 2026";
const SUPPORT = "hello@claudettescookies.shop";

export default function TermsPage() {
  return (
    <div className="container-prose py-16">
      <h1 className="font-display text-4xl font-semibold text-[hsl(var(--maroon))]">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-foreground/90 leading-relaxed">
        <section>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
            Claudette&rsquo;s Cookies website at{" "}
            <a href="https://www.claudettescookies.shop" className="text-primary underline">
              claudettescookies.shop
            </a>{" "}
            and any purchase you make from us. By using the Site or placing an order, you agree to
            these Terms. If you don&rsquo;t agree, please don&rsquo;t use the Site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Eligibility</h2>
          <p className="mt-3">
            You must be at least 18 years old, or have the consent and supervision of a parent or
            guardian, to place an order.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Orders &amp; pricing</h2>
          <p className="mt-3">
            All prices are in U.S. dollars. Our cookies are baked to order. We make every effort to
            display accurate prices and product information, but errors can happen; we reserve the
            right to correct errors and to refuse or cancel any order (including after it&rsquo;s
            placed), in which case we&rsquo;ll refund any amount charged. Placing an order is an
            offer to buy, which we accept when we charge your payment method and begin fulfillment.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Payment</h2>
          <p className="mt-3">
            Payments are processed securely by Stripe. By providing a payment method, you represent
            that you&rsquo;re authorized to use it and authorize us to charge the order total,
            including taxes and shipping where applicable.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Shipping &amp; delivery</h2>
          <p className="mt-3">
            We ship across the United States. Boxes are baked to order and shipped fresh. Delivery
            estimates are not guaranteed, and once an order is handed to the carrier, transit times
            are outside our control. Title and risk of loss pass to you on delivery. If something
            goes wrong &mdash; a late, lost, or damaged package &mdash; reach out and we&rsquo;ll
            make it right under our guarantee.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Money-back guarantee &amp; returns</h2>
          <p className="mt-3">
            If you&rsquo;re not in love with your box, we&rsquo;ll make it right. Full details are in
            our{" "}
            <Link href="/returns" className="text-primary underline">
              Returns &amp; Money-Back Guarantee
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Allergens &amp; food safety</h2>
          <p className="mt-3">
            Our cookies are made in a kitchen that handles{" "}
            <strong>wheat, dairy, eggs, tree nuts, peanuts, and soy</strong>. Even items described
            as gluten-free or made without a given ingredient may contain trace amounts due to
            shared equipment. If you have a food allergy or sensitivity, please review the
            ingredients on our{" "}
            <Link href="/clean-label" className="text-primary underline">
              Clean Label
            </Link>{" "}
            page and order at your own discretion. Always use your judgment for serious allergies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Promotions, discount codes &amp; gift cards</h2>
          <p className="mt-3">
            Discount codes (such as welcome offers) are for a single use unless stated otherwise,
            can&rsquo;t be combined unless we say so, carry no cash value, and may be changed or
            ended at any time. Gift cards are redeemable toward purchases on the Site and are
            non-refundable except where required by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Intellectual property</h2>
          <p className="mt-3">
            The Site and its content &mdash; including the Claudette&rsquo;s Cookies name, logo,
            text, photography, and designs &mdash; are owned by us or our licensors and protected by
            intellectual property laws. You may not copy, reproduce, or use them without our prior
            written permission.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Acceptable use</h2>
          <p className="mt-3">
            You agree not to misuse the Site &mdash; including attempting to disrupt it, access it
            without authorization, scrape it, or use it for any unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Disclaimers &amp; limitation of liability</h2>
          <p className="mt-3">
            The Site and products are provided &ldquo;as is&rdquo; to the fullest extent permitted
            by law. To the maximum extent permitted by law, Claudette&rsquo;s Cookies will not be
            liable for indirect, incidental, or consequential damages, and our total liability for
            any claim relating to an order will not exceed the amount you paid for that order.
            Nothing in these Terms limits any liability that can&rsquo;t be limited under applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Governing law</h2>
          <p className="mt-3">
            These Terms are governed by the laws of the State of New York, without regard to its
            conflict-of-laws rules. Any dispute will be resolved in the state or federal courts
            located in New York.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Changes</h2>
          <p className="mt-3">
            We may update these Terms from time to time. Changes take effect when posted, and the
            &ldquo;Last updated&rdquo; date above will reflect the latest version.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Contact</h2>
          <p className="mt-3">
            Questions about these Terms? Email{" "}
            <a href={`mailto:${SUPPORT}`} className="text-primary underline">
              {SUPPORT}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
