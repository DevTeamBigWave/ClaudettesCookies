-- ============================================================================
-- Claudette's Cookies — core schema
-- Money is stored as integer cents (USD). No floats, anywhere.
-- Timestamps are timestamptz, defaulting to now().
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive email

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role          as enum ('customer', 'staff', 'admin');
create type product_status     as enum ('draft', 'active', 'archived');
create type order_status        as enum ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');
create type fulfillment_status  as enum ('unfulfilled', 'partial', 'fulfilled');
create type discount_type       as enum ('percentage', 'fixed_amount', 'free_shipping');
create type gift_card_status    as enum ('active', 'redeemed', 'disabled', 'expired');
create type post_status         as enum ('draft', 'published');
create type subscriber_status   as enum ('subscribed', 'unsubscribed', 'cleaned', 'pending');
create type campaign_status     as enum ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
create type email_event_type    as enum ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed');

-- helper: keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Identity — profiles mirror auth.users (Supabase Auth owns credentials)
-- ----------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null,
  full_name   text,
  role        user_role not null default 'customer',
  marketing_opt_in boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever an auth user is created. Admin bootstrap
-- (granting the 'admin' role) is handled in app code from ADMIN_EMAILS.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Catalog
-- ----------------------------------------------------------------------------
create table collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  image_url   text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  handle        text not null unique,                 -- URL slug
  title         text not null,
  subtitle      text,                                 -- the punchy hook line
  description   text,
  status        product_status not null default 'active',
  price_cents   int not null check (price_cents >= 0),
  compare_at_cents int check (compare_at_cents >= 0), -- for showing a strike-through
  currency      text not null default 'USD',
  featured      boolean not null default false,
  ingredients   text,
  allergens     text[],                               -- e.g. {gluten-free, contains nuts}
  seo_title     text,
  seo_description text,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on products (status);
create index on products (featured) where featured;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  alt         text,
  position    int not null default 0
);
create index on product_images (product_id);

-- One row per buyable SKU. Single-variant products still get one variant row,
-- which keeps inventory + line items uniform.
create table product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  title         text not null default 'Default',
  sku           text unique,
  price_cents   int not null check (price_cents >= 0),
  inventory_qty int not null default 0,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index on product_variants (product_id);

create table product_collections (
  product_id    uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

-- ----------------------------------------------------------------------------
-- Customers & orders
-- ----------------------------------------------------------------------------
-- A customer can exist before they ever create an account (guest checkout).
-- Keyed by email; optionally linked to an auth profile.
create table customers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete set null,
  email         citext not null unique,
  full_name     text,
  phone         text,
  marketing_opt_in boolean not null default false,
  total_spent_cents int not null default 0,
  orders_count  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

create table discounts (
  id            uuid primary key default gen_random_uuid(),
  code          citext not null unique,
  type          discount_type not null,
  value         int not null default 0,            -- percent (0-100) or cents
  min_subtotal_cents int not null default 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  usage_limit   int,                                -- null = unlimited
  used_count    int not null default 0,
  once_per_customer boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  bigint generated always as identity,  -- human-friendly #
  customer_id   uuid references customers(id) on delete set null,
  email         citext not null,
  status        order_status not null default 'pending',
  fulfillment   fulfillment_status not null default 'unfulfilled',
  currency      text not null default 'USD',
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  shipping_cents int not null default 0,
  tax_cents     int not null default 0,
  gift_card_cents int not null default 0,
  total_cents   int not null default 0,
  discount_id   uuid references discounts(id) on delete set null,
  discount_code text,
  shipping_address jsonb,
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index on orders (customer_id);
create index on orders (status);
create index on orders (created_at desc);
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- Line items snapshot title/price so historical orders are immutable even if a
-- product is later edited or deleted.
create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  variant_id    uuid references product_variants(id) on delete set null,
  title         text not null,
  variant_title text,
  image_url     text,
  unit_price_cents int not null,
  quantity      int not null check (quantity > 0),
  total_cents   int not null
);
create index on order_items (order_id);

-- ----------------------------------------------------------------------------
-- Gift cards
-- ----------------------------------------------------------------------------
create table gift_cards (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,               -- e.g. CLDT-XXXX-XXXX-XXXX
  initial_cents   int not null check (initial_cents > 0),
  balance_cents   int not null check (balance_cents >= 0),
  currency        text not null default 'USD',
  status          gift_card_status not null default 'active',
  purchaser_email citext,
  recipient_email citext,
  recipient_name  text,
  gift_message    text,
  order_id        uuid references orders(id) on delete set null,  -- purchase order
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_gift_cards_updated before update on gift_cards
  for each row execute function set_updated_at();

create table gift_card_transactions (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references gift_cards(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  amount_cents  int not null,                         -- negative = redemption
  created_at    timestamptz not null default now()
);
create index on gift_card_transactions (gift_card_id);

-- ----------------------------------------------------------------------------
-- Blog / content
-- ----------------------------------------------------------------------------
create table blog_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  excerpt       text,
  body          text not null default '',             -- markdown
  cover_image_url text,
  author_name   text not null default 'Claudette''s Cookies',
  status        post_status not null default 'draft',
  tags          text[] not null default '{}',
  seo_title     text,
  seo_description text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on blog_posts (status, published_at desc);
create trigger trg_blog_posts_updated before update on blog_posts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Email marketing
-- ----------------------------------------------------------------------------
create table email_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  full_name     text,
  status        subscriber_status not null default 'subscribed',
  source        text,                                 -- 'footer', 'checkout', 'import'
  customer_id   uuid references customers(id) on delete set null,
  tags          text[] not null default '{}',
  unsubscribe_token uuid not null default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at    timestamptz not null default now()
);
create index on email_subscribers (status);

create table email_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  subject       text not null,
  preheader     text,
  from_name     text,
  body_html     text not null default '',
  body_markdown text,
  status        campaign_status not null default 'draft',
  segment       jsonb not null default '{}'::jsonb,   -- filter: tags/status/etc.
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  recipients_count int not null default 0,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on email_campaigns (status, scheduled_at);
create trigger trg_email_campaigns_updated before update on email_campaigns
  for each row execute function set_updated_at();

-- Per-recipient delivery + engagement log (also powers analytics).
create table email_events (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references email_campaigns(id) on delete cascade,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  email         citext not null,
  type          email_event_type not null,
  provider_id   text,                                 -- Resend message id
  meta          jsonb,
  created_at    timestamptz not null default now()
);
create index on email_events (campaign_id);
create index on email_events (type);

-- ----------------------------------------------------------------------------
-- Abandoned carts (server snapshot for recovery automation)
-- ----------------------------------------------------------------------------
create table abandoned_carts (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null,
  items         jsonb not null,
  subtotal_cents int not null default 0,
  recovered     boolean not null default false,
  reminder_sent_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on abandoned_carts (recovered, created_at);
create trigger trg_abandoned_carts_updated before update on abandoned_carts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Stripe webhook idempotency ledger
-- ----------------------------------------------------------------------------
create table webhook_events (
  id            text primary key,                     -- Stripe event id
  type          text not null,
  processed_at  timestamptz not null default now()
);
