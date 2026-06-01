-- ============================================================================
-- Atomic commerce operations (called from the Stripe webhook with the
-- service-role key). Doing this in the database guarantees that marking an
-- order paid, decrementing inventory, and rolling up customer stats either all
-- happen or none do — even under concurrent webhook retries.
-- ============================================================================

-- Finalize a paid order: idempotent on orders.status.
-- Returns true if this call performed the transition, false if already paid.
create or replace function finalize_paid_order(
  p_order_id uuid,
  p_payment_intent text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
  v_item record;
begin
  -- Lock the order row; bail if already finalized (idempotency).
  select status = 'paid' into v_already
  from orders where id = p_order_id for update;

  if v_already then
    return false;
  end if;

  update orders
     set status = 'paid',
         stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
         paid_at = now()
   where id = p_order_id;

  -- Decrement inventory per line (never below zero).
  for v_item in
    select variant_id, quantity from order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update product_variants
       set inventory_qty = greatest(0, inventory_qty - v_item.quantity)
     where id = v_item.variant_id;
  end loop;

  -- Roll up customer lifetime stats.
  update customers c
     set orders_count = orders_count + 1,
         total_spent_cents = total_spent_cents + o.total_cents
    from orders o
   where o.id = p_order_id and c.id = o.customer_id;

  -- Count a discount usage if one was applied.
  update discounts d
     set used_count = used_count + 1
    from orders o
   where o.id = p_order_id and o.discount_id = d.id;

  return true;
end;
$$;

-- Atomically redeem from a gift card, clamping at the available balance.
-- Returns the amount actually applied (in cents).
create or replace function redeem_gift_card(
  p_code text,
  p_amount_cents int,
  p_order_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card gift_cards%rowtype;
  v_applied int;
begin
  select * into v_card from gift_cards
   where code = p_code and status = 'active'
   for update;

  if not found then
    return 0;
  end if;

  if v_card.expires_at is not null and v_card.expires_at < now() then
    update gift_cards set status = 'expired' where id = v_card.id;
    return 0;
  end if;

  v_applied := least(v_card.balance_cents, greatest(0, p_amount_cents));
  if v_applied = 0 then
    return 0;
  end if;

  update gift_cards
     set balance_cents = balance_cents - v_applied,
         status = case when balance_cents - v_applied = 0 then 'redeemed'::gift_card_status
                       else status end
   where id = v_card.id;

  insert into gift_card_transactions (gift_card_id, order_id, amount_cents)
  values (v_card.id, p_order_id, -v_applied);

  return v_applied;
end;
$$;
