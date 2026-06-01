import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Lazily-constructed Resend client (see stripe.ts for the rationale — the API
 * key isn't available during `next build`). Call sites use `resend.x` unchanged.
 */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return Reflect.get(getResend(), prop, getResend());
  },
});

export const EMAIL_FROM = env.RESEND_FROM_EMAIL;
export const EMAIL_REPLY_TO = env.RESEND_REPLY_TO;

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

/** Thin wrapper so callers don't repeat from/reply-to and get uniform errors. */
export async function sendEmail({ to, subject, html, headers }: SendArgs) {
  return resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    replyTo: EMAIL_REPLY_TO,
    headers,
  });
}
