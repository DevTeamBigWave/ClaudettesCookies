import { CheckCircle2, AlertTriangle, CreditCard, Mail, Truck, Sparkles, Database } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { GoogleIntegrationCard } from "@/components/admin/google-integration-card";
import { env } from "@/lib/env";
import { hasOAuthClient } from "@/lib/google-calendar";
import { GOOGLE_CALENDAR_INTEGRATION, getIntegration } from "@/lib/integrations";

/** Human-readable explanation for the OAuth error codes our callback can return. */
const ERROR_COPY: Record<string, string> = {
  invalid_state: "The sign-in didn't match — please try connecting again.",
  no_refresh_token: "Google didn't return a refresh token. Try Disconnect, then Connect again.",
  missing_client: "Set the Google OAuth client id/secret in Railway first.",
  access_denied: "You declined the Google permission request.",
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected: justConnected, error } = await searchParams;
  const row = await getIntegration(GOOGLE_CALENDAR_INTEGRATION);

  const hasClient = hasOAuthClient();
  const hasEnvToken = Boolean(env.GOOGLE_OAUTH_REFRESH_TOKEN);
  const source: "oauth" | "env" | null = row?.refresh_token ? "oauth" : hasEnvToken ? "env" : null;
  const connected = source !== null;

  // Env-managed integrations (configured via Railway, shown read-only here).
  const managed = [
    {
      name: "Stripe",
      desc: "Checkout & payments.",
      icon: CreditCard,
      configured: true, // STRIPE_SECRET_KEY is required to boot
      detail: env.STRIPE_WEBHOOK_SECRET ? "Live · webhook verified" : "Live · webhook secret not set",
    },
    {
      name: "Resend",
      desc: "Order receipts & email campaigns.",
      icon: Mail,
      configured: Boolean(env.RESEND_API_KEY),
      detail: env.RESEND_API_KEY ? "Sending enabled" : "Emails are skipped until configured",
    },
    {
      name: "FedEx",
      desc: "Live shipping rates at checkout.",
      icon: Truck,
      configured: Boolean(
        env.FEDEX_API_KEY && env.FEDEX_API_SECRET && env.FEDEX_ACCOUNT_NUMBER && env.FEDEX_ORIGIN_ZIP,
      ),
      detail:
        env.FEDEX_API_KEY && env.FEDEX_API_SECRET && env.FEDEX_ACCOUNT_NUMBER && env.FEDEX_ORIGIN_ZIP
          ? `Live rates (${env.FEDEX_ENV})`
          : "Falling back to flat-rate shipping",
    },
    {
      name: "Anthropic",
      desc: "Weekly auto-generated journal posts.",
      icon: Sparkles,
      configured: Boolean(env.ANTHROPIC_API_KEY),
      detail: env.ANTHROPIC_API_KEY ? "Generation enabled" : "Auto-posts disabled",
    },
    {
      name: "Supabase",
      desc: "Database & storage.",
      icon: Database,
      configured: true,
      detail: "Connected",
    },
  ];

  return (
    <>
      <PageHeader title="Integrations" description="Connect and monitor the services that power the store." />

      {justConnected && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="size-4" /> Google Calendar connected. New orders will appear on your calendar.
        </div>
      )}
      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4" /> {ERROR_COPY[error] ?? `Couldn't connect Google: ${error}`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GoogleIntegrationCard
          connected={connected}
          source={source}
          hasClient={hasClient}
          accountEmail={row?.account_email ?? null}
          calendarId={env.GOOGLE_CALENDAR_ID}
          scope={row?.scope ?? null}
          connectedAt={row?.connected_at ?? null}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-1 font-display text-lg font-semibold">Managed in environment</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Configured via Railway environment variables. Status only.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managed.map((m) => (
            <div key={m.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-secondary">
                    <m.icon className="size-4 text-foreground/70" />
                  </div>
                  <p className="font-medium">{m.name}</p>
                </div>
                <span
                  className={
                    m.configured
                      ? "inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                      : "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                  }
                >
                  {m.configured ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{m.desc}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
