-- ============================================================================
-- Shipping method capture + FedEx label storage.
--
-- The storefront now runs an embedded Stripe Custom Checkout where the customer
-- picks a Regular or Express tier (live FedEx rates, keyed to their address).
-- These columns record what they chose so the admin can fulfill, and hold the
-- tracking number + a pointer to the generated FedEx label PDF.
--
-- Labels themselves live in the private `shipping-labels` storage bucket
-- (service-role only): the admin "Generate label" route uploads the PDF and
-- hands out short-lived signed URLs for download. Idempotent: safe to re-run.
-- ============================================================================

alter table orders
  add column if not exists shipping_method     text,        -- 'Regular' | 'Express' | 'Free shipping'
  add column if not exists shipping_service     text,        -- FedEx service code, e.g. 'FEDEX_GROUND'
  add column if not exists shipping_carrier      text,        -- 'FedEx' | 'Flat'
  add column if not exists tracking_number       text,
  add column if not exists label_path            text,        -- object path within the shipping-labels bucket
  add column if not exists label_generated_at    timestamptz;

-- Private bucket for generated shipping-label PDFs. No public access and no
-- storage.objects policies: only the service-role admin client (which bypasses
-- RLS) ever reads or writes here.
insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', false)
on conflict (id) do nothing;
