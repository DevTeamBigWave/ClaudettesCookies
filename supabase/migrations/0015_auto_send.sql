-- ============================================================================
-- 0015 — Auto-send for AI-generated marketing emails
-- When enabled, the weekly/Saturday draft generators schedule the campaign for
-- `auto_send_delay_minutes` from now (a review window) instead of leaving it as
-- a draft. The existing scheduled-campaigns cron then dispatches it. Off by
-- default — nothing about current behavior changes until it's switched on.
-- ============================================================================

alter table marketing_settings
  add column if not exists auto_send boolean not null default false;

alter table marketing_settings
  add column if not exists auto_send_delay_minutes int not null default 120
  check (auto_send_delay_minutes between 0 and 10080);  -- 0 min … 7 days
