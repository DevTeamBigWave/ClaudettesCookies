-- ============================================================================
-- Local pickup option. Orders are either shipped (FedEx/flat) or picked up in
-- person. Pickup orders collect no shipping address and need no label. Default
-- 'ship' keeps every existing order unchanged. Idempotent: safe to re-run.
-- ============================================================================

alter table orders
  add column if not exists fulfillment_type text not null default 'ship'; -- 'ship' | 'pickup'
