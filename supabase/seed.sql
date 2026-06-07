-- ============================================================================
-- Seed data — sourced from the live Claudette's Cookies store (claudettescookies.shop).
-- Idempotent: safe to run repeatedly (on conflict do nothing / update).
-- Product imagery currently points at Shopify's CDN; migrate to Supabase
-- Storage and update product_images.url when assets are re-hosted.
-- ============================================================================

-- ---- Collections ----------------------------------------------------------
insert into collections (id, slug, title, description, position) values
  ('11111111-1111-1111-1111-111111111101', 'signature-boxes', 'Signature Boxes',
   'Four to a box. Zero compromise. Our core lineup, baked with the ingredients your grandma would recognize.', 1),
  ('11111111-1111-1111-1111-111111111102', 'best-sellers', 'Best Sellers',
   'The ones that keep selling out on the feed.', 2)
on conflict (id) do nothing;

-- ---- Products (all $32.00 = 3200 cents) -----------------------------------
insert into products (id, handle, title, subtitle, description, status, price_cents, currency, featured, allergens, position, is_flavor) values
  ('22222222-2222-2222-2222-222222222200', 'build-your-own',
   'Build Your Own Box', 'Pick any 6 — your call.',
   'Your box, your rules. Choose any six cookies across our signature flavors (and whatever seasonal special is in rotation) and we''ll pack them fresh in our new branded six-cookie box. The same $45 as every box — just exactly the way you want it.',
   'active', 4500, 'USD', true, '{contains nuts}', 0, false),

  ('22222222-2222-2222-2222-222222222201', 'the-intro',
   'The Intro — Meet the Family', 'All Four Flavors. Six Cookies.',
   'Welcome to the new standard. We took the "chemistry" out of cookies and replaced it with the ingredients your grandmother would recognize. One box, all four of our signature flavors — with the two crowd-favorites doubled up. Six cookies total: 2 Disco Drops, 2 Afterschool PB&Js, 1 Sicilian pistachio, and 1 Sunday Ritual chocolate chip. The easiest way to find your new ritual.',
   'active', 4500, 'USD', true, '{contains nuts}', 1, false),

  ('22222222-2222-2222-2222-222222222202', 'the-sicilians',
   'The Sicilian Stash — For the Pistachio Purist', 'Saw it on the feed? This is the box.',
   'We packed six of our luxurious Sicilian pistachio cookies into one box. No fillers, no distractions — just deep, roasted pistachio and a tender crumb. The box you were looking for.',
   'active', 4500, 'USD', true, '{contains nuts}', 2, true),

  ('22222222-2222-2222-2222-222222222203', 'the-disco-drop-your-morning-fuel-sorted',
   'The Disco Drop — Your Morning Fuel, Sorted.', 'The OG legend that started it all.',
   'This box contains six of our dense, chewy, gluten-free Disco Biscuits. Packed with oats and bananas and dipped in chocolate — breakfast that happens to taste like dessert.',
   'active', 4500, 'USD', false, '{gluten-free}', 3, true),

  ('22222222-2222-2222-2222-222222222204', 'the-lunchbox-nostalgia-on-repeat',
   'The Lunchbox — Nostalgia on Repeat.', 'Why mess with perfection?',
   'We took the classic peanut butter and jelly flavor profile and removed the junk. This box is loaded with six of our Afterschool cookies — the lunchbox memory, upgraded.',
   'active', 4500, 'USD', false, '{contains nuts}', 4, true),

  ('22222222-2222-2222-2222-222222222205', 'the-sunday-ritual-the-only-chocolate-chip-you-need',
   'The Sunday Ritual — The Only Chocolate Chip You Need.', 'Some things are classic for a reason.',
   'This box is six of The Sunday Morning — our heavy-hitting chocolate chip walnut cookie made with organic King Arthur flour. The only chocolate chip you need.',
   'active', 4500, 'USD', true, '{contains nuts}', 5, true)
on conflict (id) do nothing;

-- ---- Images ---------------------------------------------------------------
-- Self-hosted in /public/products (re-hosted from the live store's CDN).
insert into product_images (product_id, url, alt, position) values
  ('22222222-2222-2222-2222-222222222200', '/products/intro.jpeg', 'Build Your Own Box — pick any six cookies', 0),
  ('22222222-2222-2222-2222-222222222201', '/products/intro.jpeg', 'The Intro — a branded box with all four signature flavors', 0),
  ('22222222-2222-2222-2222-222222222202', '/products/sicilian.jpeg', 'The Sicilian Stash — six pistachio cookies in a box', 0),
  ('22222222-2222-2222-2222-222222222203', '/products/disco.jpeg', 'The Disco Drop — chocolate-dipped oat & banana cookies', 0),
  ('22222222-2222-2222-2222-222222222204', '/products/lunchbox.jpeg', 'The Lunchbox — six Afterschool PB&J cookies', 0),
  ('22222222-2222-2222-2222-222222222205', '/products/sunday.jpeg', 'The Sunday Ritual — chocolate chip walnut cookies', 0)
on conflict do nothing;

-- ---- Variants (single variant per product; real inventory counts) ----------
insert into product_variants (id, product_id, title, sku, price_cents, inventory_qty, position) values
  ('33333333-3333-3333-3333-333333333300', '22222222-2222-2222-2222-222222222200', 'Box of 6 — your mix', 'CC-BYO-6', 4500, 9999, 0),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Box of 6', 'CC-INTRO-6',   4500, 22, 0),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'Box of 6', 'CC-SICIL-6',   4500, 18, 0),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'Box of 6', 'CC-DISCO-6',   4500, 19, 0),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', 'Box of 6', 'CC-LUNCH-6',   4500, 19, 0),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222205', 'Box of 6', 'CC-SUNDAY-6',  4500, 18, 0)
on conflict (id) do nothing;

-- ---- Collection membership ------------------------------------------------
insert into product_collections (product_id, collection_id)
select id, '11111111-1111-1111-1111-111111111101' from products
on conflict do nothing;
insert into product_collections (product_id, collection_id) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111102')
on conflict do nothing;

-- ---- A launch promotion ----------------------------------------------------
insert into discounts (code, type, value, min_subtotal_cents, active, once_per_customer) values
  ('WELCOME10', 'percentage', 10, 0, true, true),
  ('FREESHIP', 'free_shipping', 0, 5000, true, false)
on conflict (code) do nothing;

-- ---- Blog posts ------------------------------------------------------------
insert into blog_posts (slug, title, excerpt, body, status, tags, author_name, published_at) values
  ('zero-compromise',
   'Why We Took the Chemistry Out of Cookies',
   'Four flavors, zero compromise — and a short list of ingredients you can actually pronounce.',
   E'When we started Claudette''s, the goal was simple: make the cookie you remember, with the ingredients your grandmother would recognize.\n\nNo gums you can''t pronounce. No mystery "natural flavors." Just butter, flour, real chocolate, and time.\n\nThis is what *zero compromise* means to us — and why our boxes come four to a set, one ritual at a time.',
   'published', '{story,ingredients}', 'Claudette', now() - interval '14 days'),
  ('meet-the-sicilian',
   'Meet the Sicilian: A Love Letter to Pistachio',
   'The box you saw on the feed, and the story behind the green.',
   E'Real Sicilian pistachio isn''t cheap, and it isn''t supposed to be. It''s roasted, ground, and folded into a tender crumb that does one thing extremely well.\n\nNo filler. No distractions. Just the purist''s pistachio cookie.',
   'published', '{flavors,pistachio}', 'Claudette', now() - interval '5 days')
on conflict (slug) do nothing;

-- ---- A seed newsletter subscriber -----------------------------------------
insert into email_subscribers (email, full_name, status, source) values
  ('accounting@bigwave.nyc', 'Claudette''s HQ', 'subscribed', 'seed')
on conflict (email) do nothing;
