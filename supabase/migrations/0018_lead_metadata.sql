-- ============================================================================
-- 0018 — Lead metadata payload
-- Stash structured lead context (e.g. funnel quiz answers + the computed result)
-- on the subscriber row, so funnel leads carry their context. Nullable jsonb;
-- existing signups are unaffected. email_subscribers is admin-only (service-role
-- writes; RLS already enabled with no public policies), so no new policy needed.
-- ============================================================================

alter table email_subscribers add column if not exists metadata jsonb;
