-- ============================================================================
-- Track the Google Calendar event created for a paid order, so we can avoid
-- duplicates and (later) update or cancel the event if the order changes.
-- Idempotent: safe to re-run.
-- ============================================================================

alter table orders
  add column if not exists google_event_id text;

comment on column orders.google_event_id is
  'ID of the Google Calendar event mirroring this paid order, if calendar sync is enabled.';
