-- ============================================================================
-- Third-party integration credentials/state, managed from the admin panel.
-- Currently powers the Google Calendar OAuth "Connect / Disconnect" flow: the
-- refresh token lives here (set by the consent callback) so the connection can
-- be (re)established at runtime without a redeploy or env-var edit.
--
-- Security: RLS is enabled with NO policies, so anon/authenticated clients can
-- read nothing. Only the service-role admin client (which bypasses RLS) ever
-- touches this table, and only from server-side admin routes.
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists integrations (
  id               text primary key,            -- e.g. 'google_calendar'
  status           text not null default 'disconnected',  -- connected | disconnected | error
  account_email    text,                         -- which account authorized (display only)
  access_token     text,                         -- short-lived; cached for reuse
  refresh_token    text,                         -- long-lived secret
  token_expires_at timestamptz,
  scope            text,
  last_error       text,
  connected_at     timestamptz,
  updated_at       timestamptz not null default now()
);

alter table integrations enable row level security;
-- No policies on purpose: service role only.
