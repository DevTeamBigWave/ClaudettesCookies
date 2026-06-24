-- ============================================================================
-- 0016 — SMS consent capture (A2P 10DLC compliance)
-- Records the mobile number, whether the subscriber opted in to texts, and when
-- — the consent record carriers require. All nullable/defaulted so existing
-- rows and email-only signups are unaffected.
-- ============================================================================

alter table email_subscribers add column if not exists phone           text;
alter table email_subscribers add column if not exists sms_consent     boolean not null default false;
alter table email_subscribers add column if not exists sms_consent_at  timestamptz;
