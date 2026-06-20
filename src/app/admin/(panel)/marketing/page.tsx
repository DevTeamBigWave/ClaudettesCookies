import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, DataTable, StatusPill } from "@/components/admin/ui";
import { CampaignForm } from "@/components/admin/campaign-form";
import { CampaignSendButton } from "@/components/admin/campaign-send-button";
import { CampaignCancelButton } from "@/components/admin/campaign-cancel-button";
import { SaturdayEmailCard } from "@/components/admin/saturday-email-card";
import { formatDate } from "@/lib/utils";
import type { EmailCampaign, Discount, MarketingSettings } from "@/types/db";

export default async function MarketingPage() {
  const db = createAdminClient();

  const [
    { count: subscribed },
    { count: totalSubs },
    { data: campaigns },
    { data: openEvents },
    { data: activeDiscounts },
    { data: settings },
  ] = await Promise.all([
    db.from("email_subscribers").select("*", { count: "exact", head: true }).eq("status", "subscribed"),
    db.from("email_subscribers").select("*", { count: "exact", head: true }),
    db.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("email_events").select("*", { count: "exact", head: true }).eq("type", "opened"),
    db.from("discounts").select("id, code, type, value").eq("active", true).order("created_at", { ascending: false }),
    db.from("marketing_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const sentCount = ((campaigns as EmailCampaign[]) ?? []).filter((c) => c.status === "sent").length;

  return (
    <>
      <PageHeader
        title="Email Marketing"
        description="Build your list, compose campaigns, and send — all in-house via Resend."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Subscribed" value={String(subscribed ?? 0)} hint={`${totalSubs ?? 0} total contacts`} />
        <StatCard label="Campaigns sent" value={String(sentCount)} />
        <StatCard label="Total opens" value={String(openEvents ?? 0)} hint="tracked via webhook" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(0,440px)]">
        <div className="min-w-0">
          <h2 className="mb-3 font-display text-lg font-semibold">Campaigns</h2>
          <DataTable columns={["Campaign", "Status", "Recipients", "Date", ""]}>
            {((campaigns as EmailCampaign[]) ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.subject}</div>
                </td>
                <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.status === "sent" ? c.recipients_count : c.scheduled_at ? "scheduled" : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.sent_at ? formatDate(c.sent_at) : c.scheduled_at ? formatDate(c.scheduled_at) : formatDate(c.created_at)}
                </td>
                <td className="px-4 py-3">
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <div className="flex items-center justify-end gap-1">
                      <CampaignSendButton id={c.id} />
                      <CampaignCancelButton id={c.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No campaigns yet — compose your first one.</td></tr>
            )}
          </DataTable>
        </div>
        <div className="space-y-6">
          <SaturdayEmailCard
            discounts={(activeDiscounts as Pick<Discount, "id" | "code" | "type" | "value">[]) ?? []}
            settings={(settings as MarketingSettings) ?? null}
          />
          <CampaignForm subscriberCount={subscribed ?? 0} />
        </div>
      </div>
    </>
  );
}
