import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Claudette's Cookies collects, uses, and protects your personal information, including cookies, analytics, and advertising.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "June 20, 2026";
const SUPPORT = "hello@claudettescookies.shop";

export default function PrivacyPage() {
  return (
    <div className="container-prose py-16">
      <h1 className="font-display text-4xl font-semibold text-[hsl(var(--maroon))]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-foreground/90 leading-relaxed">
        <section>
          <p>
            This Privacy Policy explains how Claudette&rsquo;s Cookies (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares information when you
            visit{" "}
            <a href="https://www.claudettescookies.shop" className="text-primary underline">
              claudettescookies.shop
            </a>{" "}
            (the &ldquo;Site&rdquo;) or place an order. By using the Site, you agree to this policy.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Information we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Information you give us:</strong> your name, email address, phone number,
              shipping address, gift messages, and the contents of any message you send us.
            </li>
            <li>
              <strong>Payment information:</strong> card payments are processed securely by{" "}
              <strong>Stripe</strong>. We never see or store your full card number &mdash; Stripe
              handles it and shares only limited details (such as the result of the charge and the
              last four digits) with us to manage your order.
            </li>
            <li>
              <strong>Information collected automatically:</strong> like most websites, we collect
              device and usage data (IP address, browser type, pages viewed, and referring links)
              through cookies and similar technologies.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">How we use your information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>To process, bake, ship, and support your orders.</li>
            <li>To send order confirmations, receipts, and shipping updates.</li>
            <li>
              To send marketing emails (such as new flavors and offers) when you&rsquo;ve opted in.
              You can unsubscribe at any time using the link in any email.
            </li>
            <li>To operate, secure, and improve the Site and prevent fraud.</li>
            <li>To measure and optimize our advertising (see below).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Cookies, analytics &amp; advertising</h2>
          <p className="mt-3">
            We use cookies and similar technologies to run the Site and to understand how it&rsquo;s
            used. With your interactions, we may use third-party tools including{" "}
            <strong>Google Analytics</strong>, <strong>Google Ads</strong>, and the{" "}
            <strong>Meta (Facebook/Instagram) Pixel</strong> to measure traffic, understand
            conversions, and show you relevant ads on other platforms.
          </p>
          <p className="mt-3">You can control this in a few ways:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Adjust or block cookies in your browser settings.</li>
            <li>
              Opt out of Google Analytics with the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Analytics Opt-out Add-on
              </a>
              .
            </li>
            <li>
              Manage ad personalization through{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Ad Settings
              </a>{" "}
              and your{" "}
              <a
                href="https://www.facebook.com/settings?tab=ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Meta ad preferences
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">How we share information</h2>
          <p className="mt-3">
            We do not sell your personal information for money. We share information only with
            service providers who help us run the business, including:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Stripe</strong> &mdash; payment processing.</li>
            <li><strong>Shippo</strong> and carriers (e.g. USPS) &mdash; shipping and tracking.</li>
            <li><strong>Resend</strong> &mdash; transactional and marketing email.</li>
            <li><strong>Supabase</strong> &mdash; secure database hosting.</li>
            <li><strong>Google</strong> and <strong>Meta</strong> &mdash; analytics and advertising.</li>
          </ul>
          <p className="mt-3">
            We may also disclose information if required by law or to protect our rights, customers,
            or the public. Note that some advertising cookies may be considered &ldquo;sharing&rdquo;
            of personal information under certain U.S. state privacy laws &mdash; see your rights
            below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Your choices &amp; rights</h2>
          <p className="mt-3">
            Depending on where you live (for example, California or the EU/UK), you may have the
            right to access, correct, delete, or receive a copy of your personal information, and to
            opt out of targeted advertising. You can unsubscribe from marketing email at any time.
            To make a request, email us at{" "}
            <a href={`mailto:${SUPPORT}`} className="text-primary underline">
              {SUPPORT}
            </a>{" "}
            and we&rsquo;ll respond as required by applicable law. We will not discriminate against
            you for exercising these rights.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Data retention &amp; security</h2>
          <p className="mt-3">
            We keep your information for as long as needed to fulfill orders, comply with our legal
            obligations, resolve disputes, and enforce our agreements. We use reasonable technical
            and organizational measures to protect it, though no method of transmission or storage
            is completely secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Children&rsquo;s privacy</h2>
          <p className="mt-3">
            The Site is intended for a general audience and is not directed to children under 13.
            We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Changes to this policy</h2>
          <p className="mt-3">
            We may update this policy from time to time. When we do, we&rsquo;ll revise the
            &ldquo;Last updated&rdquo; date above. Material changes will be made clear on this page.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Contact us</h2>
          <p className="mt-3">
            Questions about your privacy? Email{" "}
            <a href={`mailto:${SUPPORT}`} className="text-primary underline">
              {SUPPORT}
            </a>
            . See also our{" "}
            <Link href="/terms" className="text-primary underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
