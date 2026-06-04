-- ============================================================================
-- Add a per-variant shipping weight so checkout can request live FedEx rates.
-- Weight is stored in ounces (integer) to avoid float drift; the quote endpoint
-- sums box weights + packaging and converts to pounds for FedEx.
-- Idempotent: safe to re-run.
-- ============================================================================

alter table product_variants
  add column if not exists weight_oz int not null default 16
    check (weight_oz >= 0);

comment on column product_variants.weight_oz is
  'Shipping weight of one unit of this variant, in ounces. Used for FedEx rate quotes.';

-- A four-cookie box runs ~1 lb packed; tune per box as real weights are known.
update product_variants set weight_oz = 16 where weight_oz is null;
