import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { renderMarkdown } from "@/lib/markdown";
import { env } from "@/lib/env";
import type { EmailCampaign, EmailSubscriber } from "@/types/db";

type Db = ReturnType<typeof createAdminClient>;

interface Segment {
  status?: EmailSubscriber["status"];
  tags?: string[];
}

/** Resolve a campaign's segment definition to a concrete recipient list. */
async function resolveRecipients(db: Db, segment: Segment): Promise<EmailSubscriber[]> {
  let q = db.from("email_subscribers").select("*").eq("status", segment.status ?? "subscribed");
  if (segment.tags && segment.tags.length > 0) q = q.contains("tags", segment.tags);
  const { data } = await q;
  return (data as EmailSubscriber[]) ?? [];
}

/** Wrap campaign body with an unsubscribe footer (one-click, tokenized). */
function wrapBody(campaign: EmailCampaign, sub: EmailSubscriber): string {
  const html = campaign.body_html?.trim()
    ? campaign.body_html
    : renderMarkdown(campaign.body_markdown ?? "");
  const unsubUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;
  return `${campaign.preheader ? `<div style="display:none">${campaign.preheader}</div>` : ""}
    ${html}
    <hr style="margin-top:32px;border:none;border-top:1px solid #e7dcc8"/>
    <p style="font-size:12px;color:#8a7c68">
      You're receiving this because you signed up at Claudette's Cookies.
      <a href="${unsubUrl}" style="color:#8a7c68">Unsubscribe</a>.
    </p>`;
}

/**
 * Send a campaign to its full segment. Idempotency: the campaign is flipped to
 * 'sending' first; only a 'scheduled' or 'draft' campaign is eligible, so a
 * double-trigger can't double-send. Logs one email_event per recipient.
 * Returns the number queued.
 */
export async function sendCampaign(campaignId: string): Promise<{ sent: number }> {
  const db = createAdminClient();

  // Claim the campaign atomically: only proceed if still draft/scheduled.
  const { data: claimed } = await db
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)
    .in("status", ["draft", "scheduled"])
    .select("*")
    .maybeSingle();

  if (!claimed) return { sent: 0 }; // already sending/sent
  const campaign = claimed as EmailCampaign;

  const recipients = await resolveRecipients(db, campaign.segment as Segment);

  let sent = 0;
  // Send in batches to respect provider rate limits. At scale this moves to a
  // queue/worker, but batching keeps the MVP within limits.
  const BATCH = 50;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (sub) => {
        try {
          const { data } = await resend.emails.send({
            from: campaign.from_name ? `${campaign.from_name} <${stripAddress(EMAIL_FROM)}>` : EMAIL_FROM,
            to: sub.email,
            subject: campaign.subject,
            html: wrapBody(campaign, sub),
            replyTo: EMAIL_REPLY_TO,
          });
          await db.from("email_events").insert({
            campaign_id: campaign.id,
            subscriber_id: sub.id,
            email: sub.email,
            type: "sent",
            provider_id: data?.id ?? null,
          });
          sent++;
        } catch (e) {
          await db.from("email_events").insert({
            campaign_id: campaign.id,
            subscriber_id: sub.id,
            email: sub.email,
            type: "failed",
            meta: { error: String(e) },
          });
        }
      }),
    );
  }

  await db
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), recipients_count: sent })
    .eq("id", campaign.id);

  return { sent };
}

function stripAddress(from: string): string {
  const m = from.match(/<(.+)>/);
  return m ? m[1] : from;
}
