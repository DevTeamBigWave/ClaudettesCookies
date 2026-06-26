-- ============================================================================
-- 0017 — SMS consent at checkout (A2P 10DLC)
-- Records whether the customer opted in to texts when placing the order, and
-- when. Tied to the phone already stored on the order. Defaulted/nullable so
-- existing orders are unaffected.
-- ============================================================================

alter table orders add column if not exists sms_consent     boolean not null default false;
alter table orders add column if not exists sms_consent_at  timestamptz;
