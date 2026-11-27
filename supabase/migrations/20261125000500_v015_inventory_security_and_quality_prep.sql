-- V0.1.5 Migration 5 (Pre-Integration Security Hardening & Quality Readiness)
-- Addresses GPT independent domain review findings on K5 inventory without altering existing 20261125000100..0400 files:
-- 1. Explicitly revokes EXECUTE on all SECURITY DEFINER internal helpers from PUBLIC, anon, authenticated, and service_role.
-- 2. Enforces canonical world -> inventory_items lock order inside _inventory_adjust_item so concurrent grants on a
--    brand-new (world_id, owner_scope, item_sku) row serialize safely under the world lock and add delta atomically.
-- 3. Documents future V0.2.0 quality-aware inventory readiness contract without modifying K5 primary keys pre-integration.
-- Note: Integration Master must still reconcile prefix 20261125000100 collision between GPT v01_security_hardening and Neon v015_inventory.

REVOKE ALL ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._build_mailbox_snapshot(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._inventory_adjust_item(
  p_world_id uuid,
  p_owner_scope text,
  p_item_sku text,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stack_limit integer;
  v_next integer;
BEGIN
  IF p_owner_scope <> 'shared' AND p_owner_scope !~ '^user:[0-9a-f-]+$' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  -- Canonical lock order: ALWAYS lock parent world row first, even when callers forget
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT stack_limit INTO v_stack_limit
  FROM public.item_catalog
  WHERE sku = p_item_sku;

  IF v_stack_limit IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Atomic delta upsert handles concurrent brand-new SKU creation without overwriting deltas
  INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, updated_at)
  VALUES (p_world_id, p_owner_scope, p_item_sku, p_delta, now())
  ON CONFLICT (world_id, owner_scope, item_sku) DO UPDATE
  SET qty = public.inventory_items.qty + p_delta,
      updated_at = now()
  RETURNING qty INTO v_next;

  IF v_next < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  IF v_next > v_stack_limit THEN
    RAISE EXCEPTION 'STACK_FULL';
  END IF;

  IF v_next = 0 THEN
    DELETE FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku;
  END IF;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Ensure quality readiness contract constraint helper is prepared idempotently for V0.2.0 migration:
-- Planned V0.2.0 migration step after Integration Master merges DeepSeek catalog:
--   ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'normal' CHECK (quality IN ('normal', 'silver', 'gold'));
--   UPDATE public.inventory_items SET quality = 'normal' WHERE quality IS NULL;
--   Swap PK from (world_id, owner_scope, item_sku) -> (world_id, owner_scope, item_sku, quality) atomically.
