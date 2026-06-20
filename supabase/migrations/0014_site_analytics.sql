-- ============================================================================
-- 0014 — First-party site analytics
-- A lightweight, privacy-friendly traffic log the admin dashboard reads
-- directly, plus per-order attribution so "sales by source" (Facebook, Google,
-- direct, …) can be shown alongside the third-party pixels. No IPs or PII are
-- stored — visitors are counted by a random first-party id only.
-- ============================================================================

-- ---- Page views ------------------------------------------------------------
create table if not exists page_views (
  id            uuid primary key default gen_random_uuid(),
  path          text not null,
  referrer_host text,            -- external referrer hostname only (null for internal)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  visitor_id    text,            -- random id from the browser; not personal
  created_at    timestamptz not null default now()
);
create index if not exists page_views_created_at_idx on page_views (created_at desc);
create index if not exists page_views_utm_source_idx  on page_views (utm_source);
create index if not exists page_views_visitor_idx     on page_views (visitor_id);

alter table page_views enable row level security;
-- Writes/reads go through the service-role key (route handlers + admin). No
-- public policies; staff get explicit access for parity with the other tables.
create policy "staff page_views all" on page_views for all using (is_staff()) with check (is_staff());

-- ---- Order attribution -----------------------------------------------------
-- Stamped from the visitor's stored first-touch/last-touch campaign tags when
-- the order is created. Nullable; existing orders simply read as "Direct".
alter table orders add column if not exists utm_source    text;
alter table orders add column if not exists utm_medium    text;
alter table orders add column if not exists utm_campaign  text;
alter table orders add column if not exists referrer_host text;
create index if not exists orders_utm_source_idx on orders (utm_source);
