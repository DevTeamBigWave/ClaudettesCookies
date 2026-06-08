-- Background Journal drops: a job row tracks each "Generate drop" run so the
-- admin can kick it off and leave the page while Claude writes. The button
-- polls the latest row for status. Admin-only (service role); the storefront
-- never touches it, so RLS is enabled with no public policies.

create table if not exists blog_generation_jobs (
  id               uuid primary key default gen_random_uuid(),
  status           text not null default 'running' check (status in ('running', 'done', 'error')),
  requested_count  int not null default 3,
  published_count  int not null default 0,
  published_titles text[] not null default '{}',
  error            text,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);

-- The button only ever queries the most recent job.
create index if not exists blog_generation_jobs_created_at_idx
  on blog_generation_jobs (created_at desc);

alter table blog_generation_jobs enable row level security;
