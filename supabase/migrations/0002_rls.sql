-- ============================================================================
-- Row Level Security
-- Principle: the browser (anon/auth'd) can READ public catalog/content and its
-- OWN orders. Every meaningful write happens server-side via the service-role
-- key inside route handlers, which bypasses RLS. So we deliberately grant no
-- public write policies on commerce tables.
-- ============================================================================

-- helper: is the current user an admin/staff?
create or replace function is_staff() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$ language sql security definer set search_path = public stable;

-- Enable RLS on everything.
alter table profiles               enable row level security;
alter table collections            enable row level security;
alter table products               enable row level security;
alter table product_images         enable row level security;
alter table product_variants       enable row level security;
alter table product_collections    enable row level security;
alter table customers              enable row level security;
alter table discounts              enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table gift_cards             enable row level security;
alter table gift_card_transactions enable row level security;
alter table blog_posts             enable row level security;
alter table email_subscribers      enable row level security;
alter table email_campaigns        enable row level security;
alter table email_events           enable row level security;
alter table abandoned_carts        enable row level security;
alter table webhook_events         enable row level security;

-- ---- Profiles: you can see/edit yourself; staff can see all ----------------
create policy "own profile read"  on profiles for select using (id = auth.uid() or is_staff());
create policy "own profile write" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "staff profile all" on profiles for all using (is_staff()) with check (is_staff());

-- ---- Public catalog reads (published only); staff full access --------------
create policy "public collections read" on collections for select using (true);
create policy "staff collections all"   on collections for all using (is_staff()) with check (is_staff());

create policy "public active products" on products for select
  using (status = 'active' or is_staff());
create policy "staff products all" on products for all using (is_staff()) with check (is_staff());

create policy "public product images" on product_images for select using (true);
create policy "staff product images all" on product_images for all using (is_staff()) with check (is_staff());

create policy "public variants read" on product_variants for select using (true);
create policy "staff variants all"   on product_variants for all using (is_staff()) with check (is_staff());

create policy "public product_collections read" on product_collections for select using (true);
create policy "staff product_collections all" on product_collections for all using (is_staff()) with check (is_staff());

-- ---- Blog: public sees published; staff sees all ---------------------------
create policy "public published posts" on blog_posts for select
  using (status = 'published' or is_staff());
create policy "staff posts all" on blog_posts for all using (is_staff()) with check (is_staff());

-- ---- Discounts: only staff can read the table; validation is server-side ----
create policy "staff discounts all" on discounts for all using (is_staff()) with check (is_staff());

-- ---- Customers / orders: a user sees their own; staff see all ---------------
create policy "own customer read" on customers for select
  using (profile_id = auth.uid() or is_staff());
create policy "staff customers all" on customers for all using (is_staff()) with check (is_staff());

create policy "own orders read" on orders for select using (
  is_staff() or customer_id in (select id from customers where profile_id = auth.uid())
);
create policy "staff orders all" on orders for all using (is_staff()) with check (is_staff());

create policy "own order items read" on order_items for select using (
  is_staff() or order_id in (
    select o.id from orders o
    join customers c on c.id = o.customer_id
    where c.profile_id = auth.uid()
  )
);
create policy "staff order items all" on order_items for all using (is_staff()) with check (is_staff());

-- ---- Gift cards / email / carts / webhooks: staff-only via RLS --------------
create policy "staff gift cards all" on gift_cards for all using (is_staff()) with check (is_staff());
create policy "staff gc tx all" on gift_card_transactions for all using (is_staff()) with check (is_staff());
create policy "staff subscribers all" on email_subscribers for all using (is_staff()) with check (is_staff());
create policy "staff campaigns all" on email_campaigns for all using (is_staff()) with check (is_staff());
create policy "staff email events all" on email_events for all using (is_staff()) with check (is_staff());
create policy "staff abandoned carts all" on abandoned_carts for all using (is_staff()) with check (is_staff());
create policy "staff webhook events all" on webhook_events for all using (is_staff()) with check (is_staff());
