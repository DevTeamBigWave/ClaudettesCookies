-- ============================================================================
-- 0018 — USPS Label Broker QR code
-- Stores the Shippo-hosted QR code URL for a label. Dropping the package at
-- USPS, they scan this QR to print the label — no printer required. Nullable;
-- only populated for USPS labels that support Label Broker.
-- ============================================================================

alter table orders add column if not exists label_qr_url text;
