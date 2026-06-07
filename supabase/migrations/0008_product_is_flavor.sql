-- ============================================================================
-- Mark which products are individual "flavors" that can be picked into a
-- Build-Your-Own box. This powers the BYO picker and lets seasonal specials
-- show up automatically: add the special as a product with is_flavor = true and
-- it appears in the picker. Sampler/bundle products (the Intro, the BYO box
-- itself) stay false. Idempotent.
-- ============================================================================

alter table products
  add column if not exists is_flavor boolean not null default false;

comment on column products.is_flavor is
  'True for single-flavor products that can be selected inside a Build-Your-Own box.';
