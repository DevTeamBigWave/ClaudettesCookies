import { formatMoney, boxContentsLines } from "@/lib/utils";
import { PICKUP } from "@/lib/pickup";

/**
 * Brand palette + type for all transactional emails. Mirrors the storefront's
 * official 2024 brand tokens (see src/app/globals.css). Inlined as hex because
 * email clients don't support CSS variables.
 *
 * Fonts: the brand faces (GT Alpina display serif, Mabry body sans) can't be
 * embedded reliably across mail clients, so they're listed first and fall back
 * to the correct web-safe equivalents — Georgia for the display serif, the
 * system sans stack for body.
 */
const COLORS = {
  sand: "#f7f0e3", // background — cream/sand (brand Cream)
  card: "#ffffff",
  ink: "#4f250c", // Brown — body copy + headlines
  muted: "#8a7257", // warm brown subtext
  border: "#e7dcc8", // card edge
  divider: "#efe6d6", // hairline rules
  paprika: "#fc480f", // Paprika — primary CTAs (matches the storefront)
  onPaprika: "#fbf7f1", // cream text on paprika
} as const;

const SERIF = "'GT Alpina', Georgia, 'Times New Roman', serif";
const SANS = "'Mabry', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Shared email chrome — inline styles for broad client support. */
export function emailShell(body: string, preheader = "", footerExtra = "") {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:${COLORS.sand};font-family:${SANS};color:${COLORS.ink};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:560px;background:${COLORS.card};border-radius:18px;overflow:hidden;border:1px solid ${COLORS.border};">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${COLORS.divider};">
<span style="font-size:22px;font-weight:700;font-family:${SERIF};color:${COLORS.ink};">Claudette&rsquo;s Cookies</span>
</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${COLORS.divider};font-size:12px;color:${COLORS.muted};">
Four flavors. Zero compromise. · Baked fresh in NYC${footerExtra}
</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${COLORS.paprika};color:${COLORS.onPaprika};text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">${label}</a>`;

/**
 * Inline-style markdown-rendered HTML so headings + links match the brand inside
 * mail clients (which strip `<style>` blocks). Tuned for our `renderMarkdown`
 * output, which emits unstyled `<h2>`/`<h3>`/`<a>` tags.
 */
export function brandMarkdownHtml(html: string) {
  return html
    .replace(
      /<h([1-3])>/g,
      `<h$1 style="font-family:${SERIF};color:${COLORS.ink};font-size:20px;margin:24px 0 10px;">`,
    )
    .replace(/<a href=/g, `<a style="color:${COLORS.paprika};text-decoration:underline;" href=`);
}

/**
 * Branded wrapper for marketing/campaign emails: the same card chrome as the
 * transactional templates, plus a tokenized one-click unsubscribe line in the
 * footer. Pass body HTML that's already been run through {@link brandMarkdownHtml}
 * (for markdown campaigns) or hand-styled (for raw-HTML campaigns).
 */
export function marketingEmail(opts: {
  bodyHtml: string;
  preheader?: string;
  unsubscribeUrl: string;
}) {
  const footer = `<br/><br/>You&rsquo;re receiving this because you signed up at Claudette&rsquo;s Cookies. <a href="${opts.unsubscribeUrl}" style="color:${COLORS.muted};text-decoration:underline;">Unsubscribe</a>.`;
  return emailShell(opts.bodyHtml, opts.preheader ?? "", footer);
}

export function welcomeEmail(siteUrl: string) {
  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 12px;">Welcome to the family 🍪</h1>
     <p>You&rsquo;re on the list. Here&rsquo;s <strong>10% off</strong> your first box with code <strong>WELCOME10</strong>.</p>
     <p style="margin:24px 0;">${btn(`${siteUrl}/shop`, "Shop the boxes")}</p>
     <p style="color:${COLORS.muted};">Four flavors, zero compromise — see what the feed&rsquo;s been talking about.</p>`,
    "Welcome — here's 10% off your first box.",
  );
}

export function orderReceiptEmail(opts: {
  orderNumber: number;
  items: { title: string; variantTitle?: string | null; quantity: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  pickup?: boolean;
  siteUrl: string;
}) {
  const rows = opts.items
    .map((i) => {
      const contents = boxContentsLines(i.variantTitle)
        .map((l) => `<div style="color:${COLORS.muted};font-size:12px;">${l}</div>`)
        .join("");
      return `<tr><td style="padding:6px 0;">${i.quantity}× ${i.title}${contents}</td>
         <td align="right" style="padding:6px 0;vertical-align:top;">${formatMoney(i.totalCents)}</td></tr>`;
    })
    .join("");
  const line = (l: string, v: number, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;" : `color:${COLORS.muted};`}">${l}</td>
     <td align="right" style="padding:4px 0;${bold ? "font-weight:700;" : ""}">${formatMoney(v)}</td></tr>`;

  const subhead = opts.pickup
    ? `The oven&rsquo;s on. ${PICKUP.instructions}`
    : "The oven&rsquo;s on. We&rsquo;ll email tracking when it ships.";

  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 4px;">Order #${opts.orderNumber} confirmed</h1>
     <p style="color:${COLORS.muted};margin:0 0 20px;">${subhead}</p>
     <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid ${COLORS.divider};border-bottom:1px solid ${COLORS.divider};padding:8px 0;">
       ${rows}
     </table>
     <table role="presentation" width="100%" style="font-size:14px;margin-top:12px;">
       ${line("Subtotal", opts.subtotalCents)}
       ${opts.discountCents > 0 ? line("Discount", -opts.discountCents) : ""}
       ${line("Shipping", opts.shippingCents)}
       ${line("Total", opts.totalCents, true)}
     </table>
     <p style="margin:24px 0 0;">${btn(`${opts.siteUrl}/shop`, "Order more")}</p>`,
    `Order #${opts.orderNumber} confirmed`,
  );
}

/**
 * Internal "new order" notification sent to the store on every paid order, with
 * the full item list (including Build-Your-Own box contents), totals, and the
 * shipping address — everything needed to start baking + packing.
 */
export function newOrderEmail(opts: {
  orderNumber: number;
  customerName?: string | null;
  customerEmail: string;
  phone?: string | null;
  items: { title: string; variantTitle?: string | null; quantity: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingMethod?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  pickup?: boolean;
  siteUrl: string;
}) {
  const rows = opts.items
    .map((i) => {
      const contents = boxContentsLines(i.variantTitle)
        .map((l) => `<div style="color:${COLORS.muted};font-size:12px;">${l}</div>`)
        .join("");
      return `<tr><td style="padding:6px 0;">${i.quantity}× ${i.title}${contents}</td>
         <td align="right" style="padding:6px 0;vertical-align:top;">${formatMoney(i.totalCents)}</td></tr>`;
    })
    .join("");
  const line = (l: string, v: number, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;" : `color:${COLORS.muted};`}">${l}</td>
     <td align="right" style="padding:4px 0;${bold ? "font-weight:700;" : ""}">${formatMoney(v)}</td></tr>`;

  const a = opts.address;
  const addressHtml = opts.pickup
    ? `<strong style="color:${COLORS.ink};">🏠 ${PICKUP.label}</strong><br>${PICKUP.address}${opts.phone ? `<br>${opts.phone}` : ""}`
    : a
    ? `${opts.customerName ? `<strong style="color:${COLORS.ink};">${opts.customerName}</strong><br>` : ""}` +
      `${a.line1 ?? ""}${a.line2 ? `, ${a.line2}` : ""}<br>` +
      `${a.city ?? ""}, ${a.state ?? ""} ${a.postal_code ?? ""}<br>${a.country ?? ""}` +
      `${opts.phone ? `<br>${opts.phone}` : ""}`
    : "No shipping address on file.";

  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 4px;">New order #${opts.orderNumber} 🍪</h1>
     <p style="color:${COLORS.muted};margin:0 0 20px;">${opts.customerName ?? opts.customerEmail} just placed an order${opts.shippingMethod ? ` · ${opts.shippingMethod}` : ""}.</p>
     <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid ${COLORS.divider};border-bottom:1px solid ${COLORS.divider};padding:8px 0;">
       ${rows}
     </table>
     <table role="presentation" width="100%" style="font-size:14px;margin-top:12px;">
       ${line("Subtotal", opts.subtotalCents)}
       ${opts.discountCents > 0 ? line("Discount", -opts.discountCents) : ""}
       ${line("Shipping", opts.shippingCents)}
       ${line("Total", opts.totalCents, true)}
     </table>
     <h2 style="font-family:${SERIF};color:${COLORS.ink};font-size:16px;margin:24px 0 6px;">${opts.pickup ? "Pickup" : "Ship to"}</h2>
     <p style="color:${COLORS.ink};margin:0 0 4px;line-height:1.6;">${addressHtml}</p>
     <p style="color:${COLORS.muted};margin:0;font-size:13px;">Customer: ${opts.customerEmail}</p>
     <p style="margin:24px 0 0;">${btn(`${opts.siteUrl}/admin/orders`, "Open in admin")}</p>`,
    `New order #${opts.orderNumber} — ${opts.customerName ?? opts.customerEmail}`,
  );
}

export function orderShippedEmail(opts: {
  orderNumber: number;
  carrier: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  siteUrl: string;
}) {
  const track = opts.trackingNumber
    ? `<p style="color:${COLORS.muted};margin:0 0 8px;">${opts.carrier} tracking: <strong style="color:${COLORS.ink};">${opts.trackingNumber}</strong></p>`
    : "";
  const cta = opts.trackingUrl
    ? `<p style="margin:24px 0 0;">${btn(opts.trackingUrl, "Track your package")}</p>`
    : `<p style="margin:24px 0 0;">${btn(`${opts.siteUrl}/shop`, "Order more")}</p>`;
  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 4px;">Your cookies are on the way 🍪</h1>
     <p style="color:${COLORS.muted};margin:0 0 20px;">Order #${opts.orderNumber} just shipped${opts.carrier ? ` via ${opts.carrier}` : ""}.</p>
     ${track}
     ${cta}`,
    `Order #${opts.orderNumber} shipped`,
  );
}

export function giftCardEmail(opts: {
  code: string;
  amountCents: number;
  recipientName: string;
  senderMessage?: string | null;
  siteUrl: string;
}) {
  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 12px;">You&rsquo;ve got cookies, ${opts.recipientName}! 🎁</h1>
     <p>Someone sent you a <strong>${formatMoney(opts.amountCents)}</strong> Claudette&rsquo;s gift card.</p>
     ${opts.senderMessage ? `<p style="background:${COLORS.sand};border-radius:12px;padding:16px;font-style:italic;">&ldquo;${opts.senderMessage}&rdquo;</p>` : ""}
     <p style="font-size:13px;color:${COLORS.muted};margin-top:16px;">Your code</p>
     <p style="font-size:22px;font-weight:700;letter-spacing:2px;font-family:monospace;">${opts.code}</p>
     <p style="margin:24px 0;">${btn(`${opts.siteUrl}/shop`, "Redeem it")}</p>`,
    `You've got a Claudette's gift card 🎁`,
  );
}

export function abandonedCartEmail(opts: { siteUrl: string; itemTitles: string[] }) {
  return emailShell(
    `<h1 style="font-family:${SERIF};color:${COLORS.ink};font-size:24px;margin:0 0 12px;">You left these behind 🍪</h1>
     <p>Your bag is still warm: <strong>${opts.itemTitles.join(", ")}</strong>.</p>
     <p>Here&rsquo;s <strong>10% off</strong> to finish up — code <strong>WELCOME10</strong>.</p>
     <p style="margin:24px 0;">${btn(`${opts.siteUrl}/cart`, "Complete my order")}</p>`,
    "You left cookies in your bag.",
  );
}
