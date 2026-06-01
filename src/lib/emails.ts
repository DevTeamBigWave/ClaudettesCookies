import { formatMoney } from "@/lib/utils";

/** Shared email chrome — inline styles for broad client support. */
function layout(body: string, preheader = "") {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f7f0e3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2c2118;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7dcc8;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #efe6d6;">
<span style="font-size:22px;font-weight:700;font-family:Georgia,serif;">Claudette&rsquo;s Cookies</span>
</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #efe6d6;font-size:12px;color:#8a7c68;">
Four flavors. Zero compromise. · Baked fresh in NYC
</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#b02a44;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">${label}</a>`;

export function welcomeEmail(siteUrl: string) {
  return layout(
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">Welcome to the family 🍪</h1>
     <p>You&rsquo;re on the list. Here&rsquo;s <strong>10% off</strong> your first box with code <strong>WELCOME10</strong>.</p>
     <p style="margin:24px 0;">${btn(`${siteUrl}/shop`, "Shop the boxes")}</p>
     <p style="color:#8a7c68;">Four flavors, zero compromise — see what the feed&rsquo;s been talking about.</p>`,
    "Welcome — here's 10% off your first box.",
  );
}

export function orderReceiptEmail(opts: {
  orderNumber: number;
  items: { title: string; quantity: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  siteUrl: string;
}) {
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;">${i.quantity}× ${i.title}</td>
         <td align="right" style="padding:6px 0;">${formatMoney(i.totalCents)}</td></tr>`,
    )
    .join("");
  const line = (l: string, v: number, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;" : "color:#8a7c68;"}">${l}</td>
     <td align="right" style="padding:4px 0;${bold ? "font-weight:700;" : ""}">${formatMoney(v)}</td></tr>`;

  return layout(
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 4px;">Order #${opts.orderNumber} confirmed</h1>
     <p style="color:#8a7c68;margin:0 0 20px;">The oven&rsquo;s on. We&rsquo;ll email tracking when it ships.</p>
     <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #efe6d6;border-bottom:1px solid #efe6d6;padding:8px 0;">
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

export function giftCardEmail(opts: {
  code: string;
  amountCents: number;
  recipientName: string;
  senderMessage?: string | null;
  siteUrl: string;
}) {
  return layout(
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">You&rsquo;ve got cookies, ${opts.recipientName}! 🎁</h1>
     <p>Someone sent you a <strong>${formatMoney(opts.amountCents)}</strong> Claudette&rsquo;s gift card.</p>
     ${opts.senderMessage ? `<p style="background:#f7f0e3;border-radius:12px;padding:16px;font-style:italic;">&ldquo;${opts.senderMessage}&rdquo;</p>` : ""}
     <p style="font-size:13px;color:#8a7c68;margin-top:16px;">Your code</p>
     <p style="font-size:22px;font-weight:700;letter-spacing:2px;font-family:monospace;">${opts.code}</p>
     <p style="margin:24px 0;">${btn(`${opts.siteUrl}/shop`, "Redeem it")}</p>`,
    `You've got a Claudette's gift card 🎁`,
  );
}

export function abandonedCartEmail(opts: { siteUrl: string; itemTitles: string[] }) {
  return layout(
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">You left these behind 🍪</h1>
     <p>Your bag is still warm: <strong>${opts.itemTitles.join(", ")}</strong>.</p>
     <p>Here&rsquo;s <strong>10% off</strong> to finish up — code <strong>WELCOME10</strong>.</p>
     <p style="margin:24px 0;">${btn(`${opts.siteUrl}/cart`, "Complete my order")}</p>`,
    "You left cookies in your bag.",
  );
}
