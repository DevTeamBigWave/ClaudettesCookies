-- ============================================================================
-- Shopify-style fulfillment + delivery tracking.
--
-- "Mark as shipped" sets orders.fulfillment = 'fulfilled' and records when it
-- shipped; the carrier + tracking number already live on the order (0011). These
-- columns add delivery state, polled from the FedEx Track API (or set when a
-- carrier reports delivery). Idempotent: safe to re-run.
-- ============================================================================

alter table orders
  add column if not exists shipped_at      timestamptz,
  add column if not exists delivery_status text,         -- 'in_transit' | 'delivered' | 'exception' | 'unknown'
  add column if not exists delivered_at    timestamptz;
