-- Pay by savings: the buyer chooses free small deposits or 2 to 5 instalments and a duration.
-- The seller accepts (and must then hold the quantity aside: it leaves the stock) or refuses.
-- When the full amount is saved the order is placed automatically; if the deadline passes,
-- the money goes back to the buyer's wallet and the items back into stock.
ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS installments int,
  ADD COLUMN IF NOT EXISTS installment_amount numeric,
  ADD COLUMN IF NOT EXISTS interval_days int,
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS seller_decision text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS refused_reason text,
  ADD COLUMN IF NOT EXISTS reserved_qty int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address_id uuid;
ALTER TABLE public.savings_goals DROP CONSTRAINT IF EXISTS savings_goals_status_check;
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_status_check
  CHECK (status = ANY (ARRAY['pending_seller','active','completed','cancelled','refused','expired']));
ALTER TABLE public.savings_goals DROP CONSTRAINT IF EXISTS savings_goals_plan_check;
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_plan_check CHECK (plan IN ('free','installments')
  AND (plan = 'free' OR installments BETWEEN 2 AND 5));
CREATE INDEX IF NOT EXISTS savings_goals_seller_idx ON public.savings_goals (seller_id, status);

DROP POLICY IF EXISTS "Sellers see savings plans on their products" ON public.savings_goals;
CREATE POLICY "Sellers see savings plans on their products" ON public.savings_goals FOR SELECT TO authenticated
  USING (seller_id IS NOT NULL AND public.can_manage_seller(seller_id));

-- Moves reserved items in or out of stock (variant stock when a variant is chosen).
CREATE OR REPLACE FUNCTION public._savings_stock(g savings_goals, p_delta int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF g.variant_id IS NOT NULL THEN
    UPDATE product_variants SET stock = stock + p_delta WHERE id = g.variant_id;
  ELSE
    UPDATE products SET stock = stock + p_delta WHERE id = g.product_id AND stock IS NOT NULL;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._savings_stock(savings_goals, int) FROM PUBLIC, anon, authenticated;

-- 1. The buyer asks the seller.
CREATE OR REPLACE FUNCTION public.create_savings_plan(p_product_id uuid, p_quantity int DEFAULT 1, p_variant_id uuid DEFAULT NULL,
  p_plan text DEFAULT 'free', p_installments int DEFAULT NULL, p_duration_days int DEFAULT 60, p_address_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p products; v_id uuid; v_qty int := GREATEST(COALESCE(p_quantity, 1), 1); v_target numeric; v_days int; v_n int; v_addr text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_plan NOT IN ('free','installments') THEN RAISE EXCEPTION 'Formule inconnue'; END IF;
  v_n := CASE WHEN p_plan = 'installments' THEN p_installments END;
  IF p_plan = 'installments' AND (v_n IS NULL OR v_n NOT BETWEEN 2 AND 5) THEN RAISE EXCEPTION 'Choisissez entre 2 et 5 tranches'; END IF;
  v_days := LEAST(GREATEST(COALESCE(p_duration_days, 60), 7), 180);
  SELECT * INTO v_p FROM products WHERE id = p_product_id AND is_active AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF v_p.seller_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre article'; END IF;
  IF v_qty > 100 THEN RAISE EXCEPTION 'Quantité trop élevée'; END IF;
  IF (SELECT count(*) FROM savings_goals WHERE user_id = auth.uid() AND status IN ('pending_seller','active')) >= 10 THEN RAISE EXCEPTION '10 épargnes en cours maximum'; END IF;
  v_target := public.quote_product_price(p_product_id, p_variant_id, v_qty) * v_qty;
  IF p_address_id IS NOT NULL THEN SELECT public.format_address(a) INTO v_addr FROM addresses a WHERE a.id = p_address_id AND a.user_id = auth.uid(); END IF;
  INSERT INTO savings_goals (user_id, product_id, variant_id, title, quantity, target_amount, deadline, shipping_address, status,
    plan, installments, installment_amount, interval_days, seller_id, seller_decision, address_id)
  VALUES (auth.uid(), p_product_id, p_variant_id, v_p.title, v_qty, v_target, current_date + v_days, v_addr, 'pending_seller',
    p_plan, v_n, CASE WHEN v_n IS NOT NULL THEN ceil(v_target / v_n) END, CASE WHEN v_n IS NOT NULL THEN GREATEST(v_days / v_n, 1) END,
    v_p.seller_id, 'pending', CASE WHEN p_address_id IS NOT NULL AND v_addr IS NOT NULL THEN p_address_id END)
  RETURNING id INTO v_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_p.seller_id, 'savings', 'Demande d''achat par épargne',
    v_qty || ' × ' || v_p.title || ' — ' || round(v_target) || ' FCFA en ' ||
    CASE WHEN v_n IS NOT NULL THEN v_n || ' tranches' ELSE 'petits dépôts' END || ' sur ' || v_days || ' jours. Acceptez (l''article est réservé) ou refusez.',
    jsonb_build_object('savings_id', v_id));
  RETURN v_id;
END $$;

-- 2. The seller answers. Accepting takes the quantity out of stock until the plan ends.
CREATE OR REPLACE FUNCTION public.respond_savings_plan(p_goal_id uuid, p_accept boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals; v_stock int;
BEGIN
  SELECT * INTO g FROM savings_goals WHERE id = p_goal_id FOR UPDATE;
  IF NOT FOUND OR g.seller_id IS NULL OR NOT public.can_manage_seller(g.seller_id) THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF g.status <> 'pending_seller' THEN RAISE EXCEPTION 'Cette demande a déjà reçu une réponse'; END IF;
  IF NOT p_accept THEN
    UPDATE savings_goals SET status = 'refused', seller_decision = 'refused', decided_at = now(), refused_reason = left(p_reason, 300) WHERE id = g.id;
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Épargne refusée',
      'Le vendeur ne peut pas réserver « ' || g.title || ' »' || COALESCE(' : ' || left(p_reason, 200), '') || '.', jsonb_build_object('savings_id', g.id));
    RETURN jsonb_build_object('success', true, 'status', 'refused');
  END IF;
  IF g.variant_id IS NOT NULL THEN
    SELECT stock INTO v_stock FROM product_variants WHERE id = g.variant_id FOR UPDATE;
  ELSE
    SELECT stock INTO v_stock FROM products WHERE id = g.product_id FOR UPDATE;
  END IF;
  IF v_stock IS NOT NULL AND v_stock < g.quantity THEN RAISE EXCEPTION 'Stock insuffisant pour réserver % pièce(s)', g.quantity; END IF;
  PERFORM public._savings_stock(g, -g.quantity);
  UPDATE savings_goals SET status = 'active', seller_decision = 'accepted', decided_at = now(), reserved_qty = g.quantity,
    next_due_date = CASE WHEN plan = 'installments' THEN current_date END WHERE id = g.id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Épargne acceptée 🎉',
    '« ' || g.title || ' » est réservé pour vous jusqu''au ' || to_char(g.deadline, 'DD/MM/YYYY') ||
    CASE WHEN g.plan = 'installments' THEN '. Première tranche : ' || round(g.installment_amount) || ' FCFA.' ELSE '. Versez quand vous voulez.' END,
    jsonb_build_object('savings_id', g.id));
  RETURN jsonb_build_object('success', true, 'status', 'active');
END $$;

-- 3. Deposits. Instalments must be at least the instalment amount (or what is left).
CREATE OR REPLACE FUNCTION public.contribute_savings(p_goal_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals; v_amount numeric := round(p_amount); v_left numeric; v_price numeric; v_res jsonb; v_extra numeric;
BEGIN
  SELECT * INTO g FROM savings_goals WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Épargne introuvable'; END IF;
  IF g.status = 'pending_seller' THEN RAISE EXCEPTION 'Attendez l''accord du vendeur avant de verser'; END IF;
  IF g.status <> 'active' THEN RAISE EXCEPTION 'Cette épargne est terminée'; END IF;
  IF g.deadline IS NOT NULL AND g.deadline < current_date THEN RAISE EXCEPTION 'La date limite est passée'; END IF;
  v_left := g.target_amount - g.saved_amount;
  IF v_amount < 100 THEN RAISE EXCEPTION 'Minimum 100 FCFA'; END IF;
  IF g.plan = 'installments' AND v_amount < LEAST(g.installment_amount, v_left) THEN
    RAISE EXCEPTION 'Une tranche fait au moins % FCFA', round(LEAST(g.installment_amount, v_left));
  END IF;
  v_amount := LEAST(v_amount, v_left);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Objectif déjà atteint'; END IF;
  UPDATE wallets SET balance = balance - v_amount, updated_at = now() WHERE user_id = auth.uid() AND balance >= v_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
  VALUES (auth.uid(), 'savings', -v_amount, 'Épargne : ' || g.title, g.id, 'completed');
  UPDATE savings_goals SET saved_amount = saved_amount + v_amount,
    next_due_date = CASE WHEN plan = 'installments' THEN COALESCE(next_due_date, current_date) + interval_days END
  WHERE id = g.id RETURNING * INTO g;

  IF g.saved_amount >= g.target_amount AND g.product_id IS NOT NULL THEN
    -- The reserved items go back to stock just before the order takes them.
    IF g.reserved_qty > 0 THEN PERFORM public._savings_stock(g, g.reserved_qty); END IF;
    v_price := CASE WHEN g.seller_decision = 'accepted' THEN g.target_amount  -- price locked when the seller accepted
               ELSE public.quote_product_price(g.product_id, g.variant_id, g.quantity) * g.quantity END;
    IF v_price IS NULL OR v_price > g.saved_amount THEN
      IF g.reserved_qty > 0 THEN PERFORM public._savings_stock(g, -g.reserved_qty); END IF;
      UPDATE savings_goals SET target_amount = COALESCE(v_price, target_amount) WHERE id = g.id;
      RETURN jsonb_build_object('success', true, 'completed', false, 'price_changed', true);
    END IF;
    BEGIN
      v_res := public._place_order(auth.uid(), jsonb_build_object('product_id', g.product_id, 'variant_id', g.variant_id, 'quantity', g.quantity,
        'shipping_address', COALESCE(g.shipping_address, ''), 'address_id', g.address_id, 'payment_mode', 'prefunded',
        'unit_price_override', v_price / g.quantity, 'source', 'savings', 'source_id', g.id));
    EXCEPTION WHEN OTHERS THEN
      IF g.reserved_qty > 0 THEN PERFORM public._savings_stock(g, -g.reserved_qty); END IF;
      RETURN jsonb_build_object('success', true, 'completed', false, 'error', SQLERRM);
    END;
    v_extra := g.saved_amount - v_price;
    IF v_extra > 0 THEN
      UPDATE wallets SET balance = balance + v_extra WHERE user_id = auth.uid();
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (auth.uid(), 'refund', v_extra, 'Reliquat épargne', g.id, 'completed');
    END IF;
    UPDATE savings_goals SET status = 'completed', reserved_qty = 0, order_id = (v_res->>'order_id')::uuid WHERE id = g.id;
    RETURN jsonb_build_object('success', true, 'completed', true, 'order_id', v_res->>'order_id');
  END IF;
  RETURN jsonb_build_object('success', true, 'completed', false, 'saved', g.saved_amount, 'target', g.target_amount, 'next_due', g.next_due_date);
END $$;

-- 4. Cancelling (buyer) gives the money back and frees the items.
CREATE OR REPLACE FUNCTION public.cancel_savings(p_goal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals;
BEGIN
  SELECT * INTO g FROM savings_goals WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR g.status NOT IN ('active','pending_seller') THEN RAISE EXCEPTION 'Épargne introuvable'; END IF;
  PERFORM public._savings_close(g, 'cancelled');
END $$;

CREATE OR REPLACE FUNCTION public._savings_close(g savings_goals, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF g.saved_amount > 0 THEN
    INSERT INTO wallets (user_id) VALUES (g.user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE wallets SET balance = balance + g.saved_amount, updated_at = now() WHERE user_id = g.user_id;
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
    VALUES (g.user_id, 'refund', g.saved_amount, CASE p_status WHEN 'expired' THEN 'Épargne expirée : ' ELSE 'Épargne annulée : ' END || g.title, g.id, 'completed');
  END IF;
  IF g.reserved_qty > 0 THEN PERFORM public._savings_stock(g, g.reserved_qty); END IF;
  UPDATE savings_goals SET status = p_status, reserved_qty = 0 WHERE id = g.id;
  IF g.seller_id IS NOT NULL AND g.status = 'active' THEN
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.seller_id, 'savings',
      CASE p_status WHEN 'expired' THEN 'Épargne expirée' ELSE 'Épargne annulée' END,
      '« ' || g.title || ' » n''est plus réservé : ' || g.quantity || ' pièce(s) remise(s) en stock.', jsonb_build_object('savings_id', g.id));
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._savings_close(savings_goals, text) FROM PUBLIC, anon, authenticated;

-- 5. Daily: unanswered requests (7 days) lapse; plans past their deadline are refunded and freed.
CREATE OR REPLACE FUNCTION public.expire_savings_plans()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals; n int := 0;
BEGIN
  UPDATE savings_goals SET status = 'refused', seller_decision = 'expired', refused_reason = 'Pas de réponse du vendeur sous 7 jours'
  WHERE status = 'pending_seller' AND created_at < now() - interval '7 days';
  FOR g IN SELECT * FROM savings_goals WHERE status = 'active' AND seller_decision = 'accepted' AND deadline < current_date FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._savings_close(g, 'expired');
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Épargne expirée',
      'La date limite de « ' || g.title || ' » est passée : ' || round(g.saved_amount) || ' FCFA sont revenus sur votre portefeuille.', jsonb_build_object('savings_id', g.id));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.expire_savings_plans() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('miyashi-savings-expiry') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'miyashi-savings-expiry');
  PERFORM cron.schedule('miyashi-savings-expiry', '19 2 * * *', 'SELECT public.expire_savings_plans()');
END $$;

REVOKE EXECUTE ON FUNCTION public.create_savings_plan(uuid, int, uuid, text, int, int, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_savings_plan(uuid, int, uuid, text, int, int, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.respond_savings_plan(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_savings_plan(uuid, boolean, text) TO authenticated;
