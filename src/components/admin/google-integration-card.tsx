"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Plug, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";
import { disconnectGoogle, testGoogle } from "@/app/admin/(panel)/integrations/actions";

interface Props {
  connected: boolean;
  /** "oauth" = DB token from Connect (can disconnect); "env" = legacy env token. */
  source: "oauth" | "env" | null;
  hasClient: boolean;
  accountEmail: string | null;
  calendarId: string;
  scope: string | null;
  connectedAt: string | null;
}

export function GoogleIntegrationCard({
  connected,
  source,
  hasClient,
  accountEmail,
  calendarId,
  connectedAt,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [test, setTest] = useState<{ ok: boolean; error?: string } | null>(null);

  function onTest() {
    setTest(null);
    startTransition(async () => setTest(await testGoogle()));
  }

  function onDisconnect() {
    if (!confirm("Disconnect Google Calendar? New orders won't be added to the calendar until you reconnect.")) {
      return;
    }
    startTransition(async () => {
      await disconnectGoogle();
      setTest(null);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <CalendarGlyph />
          </div>
          <div>
            <p className="font-medium">Google Calendar</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Adds an 8–11am bake block the day after each paid order.
            </p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        {connected && accountEmail && (
          <Row label="Account">{accountEmail}</Row>
        )}
        <Row label="Calendar">{calendarId === "primary" ? "Primary calendar" : calendarId}</Row>
        {connected && source === "env" && (
          <Row label="Source">Environment variable</Row>
        )}
        {connectedAt && (
          <Row label="Connected">{new Date(connectedAt).toLocaleDateString()}</Row>
        )}
      </dl>

      {test && (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            test.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700",
          )}
        >
          {test.ok ? (
            <>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Connection looks good.
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {test.error}
            </>
          )}
        </div>
      )}

      {!hasClient && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Set <code className="font-mono text-xs">GOOGLE_OAUTH_CLIENT_ID</code> and{" "}
          <code className="font-mono text-xs">GOOGLE_OAUTH_CLIENT_SECRET</code> in Railway to enable Connect.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {hasClient && (
          <a
            href="/api/integrations/google/connect"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plug className="size-4" /> {connected ? "Reconnect" : "Connect Google"}
          </a>
        )}
        {connected && (
          <button
            type="button"
            onClick={onTest}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", isPending && "animate-spin")} /> Test
          </button>
        )}
        {connected && source === "oauth" && (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Unplug className="size-4" /> Disconnect
          </button>
        )}
      </div>

      {connected && source === "env" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Connected via an environment variable. Click Connect to manage it here, or remove{" "}
          <code className="font-mono">GOOGLE_OAUTH_REFRESH_TOKEN</code> in Railway to disconnect.
        </p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        connected ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700",
      )}
    >
      <span className={cn("size-1.5 rounded-full", connected ? "bg-green-600" : "bg-stone-500")} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" fill="#fff" stroke="#dadce0" strokeWidth="1.2" />
      <rect x="3" y="4.5" width="18" height="4" rx="2.5" fill="#4285F4" />
      <text x="12" y="17.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4285F4">31</text>
    </svg>
  );
}
