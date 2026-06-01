import { Resend } from "resend";
import { env } from "@/lib/env";

export const resend = new Resend(env.RESEND_API_KEY);

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
