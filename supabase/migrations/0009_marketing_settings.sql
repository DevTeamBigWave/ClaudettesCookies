-- Saturday-email controls: a single-row settings table the weekly drop reads
-- when composing the marketing email draft. Admin-only (service role); the
-- storefront never touches it, so RLS is enabled with no public policies.

create table if not exists marketing_settings (
  id                   int primary key default 1 check (id = 1),
  featured_discount_id uuid references discounts(id) on delete set null,
  offer_note           text,
  offer_mode           text not null default 'add' check (offer_mode in ('add', 'overwrite')),
  updated_at           timestamptz not null default now()
);

alter table marketing_settings enable row level security;

-- Seed the singleton row so the app can always upsert id = 1.
insert into marketing_settings (id) values (1) on conflict (id) do nothing;
