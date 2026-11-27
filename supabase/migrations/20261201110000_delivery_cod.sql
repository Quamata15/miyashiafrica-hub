-- Delivery: the buyer picks a driver without paying first; cash on delivery happens only when the
-- driver accepts to collect it; a seller may also be a driver and deliver their own orders.

-- 1. Sellers may open the Driver space. A seller delivering their own order still needs the
--    buyer's 6-digit handover code, so the money is never released without the buyer.
DELETE FROM public.role_conflicts WHERE (role_a = 'seller' AND role_b = 'driver') OR (role_a = 'driver' AND role_b = 'seller');

CREATE OR REPLACE FUNCTION public.guard_delivery_driver() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.driver_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.driver_id IS NOT DISTINCT FROM OLD.driver_id) THEN RETURN NEW; END IF;
  IF NOT public.has_role(NEW.driver_id, 'driver') THEN RAISE EXCEPTION 'Ce livreur n''est pas inscrit sur MIYASHI'; END IF;
  IF NEW.driver_id = NEW.buyer_id AND NOT public.has_role(NEW.driver_id, 'admin') THEN
    RAISE EXCEPTION 'Un livreur ne peut pas livrer une commande qu''il achète';
  END IF;
  RETURN NEW;
END $$;

-- 2. What the driver collects in cash, whether the buyer prepaid the delivery fee, refusals.
ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS cash_to_collect numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_held boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declined_reason text;

-- Requests are created by request_driver only (prices are computed by the server).
DROP POLICY IF EXISTS "Buyers can create delivery requests" ON public.delivery_requests;
-- Open requests are visible to available drivers; a request addressed to a driver only to that driver.
DROP POLICY IF EXISTS "Drivers can view pending requests" ON public.delivery_requests;
CREATE POLICY "Drivers can view pending requests" ON public.delivery_requests FOR SELECT TO authenticated
  USING (status = 'pending' AND (driver_id IS NULL OR driver_id = auth.uid())
         AND EXISTS (SELECT 1 FROM driver_profiles dp WHERE dp.user_id = auth.uid() AND dp.is_available));

-- 3. Ask a driver (or every available driver when p_driver_id is null) to deliver an order.
--    Prepaid order: the delivery fee is paid now from the wallet and held until the buyer confirms.
--    Cash on delivery: the driver will collect the order and the fee in cash, if they accept.
CREATE OR REPLACE FUNCTION public.request_driver(p_order_id uuid, p_driver_id uuid DEFAULT NULL, p_vehicle text DEFAULT 'moto', p_distance_km numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; v_km numeric; v_night boolean; pr record; v_id uuid; v_cash numeric := 0; v_held boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF NOT public.hit_rate_limit('request_driver:' || auth.uid(), 30, 3600) THEN RAISE EXCEPTION 'Trop de demandes, réessayez plus tard'; END IF;
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT (o.buyer_id = auth.uid() OR public.can_manage_seller(o.seller_id)) THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.product_id IS NULL OR COALESCE(o.fulfillment_method, 'delivery') <> 'delivery' THEN RAISE EXCEPTION 'Cette commande ne se livre pas à domicile'; END IF;
  IF o.status IN ('completed','cancelled','refunded') THEN RAISE EXCEPTION 'Commande clôturée'; END IF;
  IF o.payment_status NOT IN ('paid','cod_pending') THEN RAISE EXCEPTION 'Commande en attente de paiement'; END IF;
  IF EXISTS (SELECT 1 FROM delivery_requests WHERE order_id = o.id AND status IN ('pending','accepted','picked_up')) THEN
    RAISE EXCEPTION 'Une course est déjà en cours pour cette commande';
  END IF;
  IF p_vehicle NOT IN ('moto','tricycle','voiture','camionnette') THEN RAISE EXCEPTION 'Véhicule inconnu'; END IF;
  IF p_driver_id IS NOT NULL THEN
    IF p_driver_id = o.buyer_id THEN RAISE EXCEPTION 'Un livreur ne peut pas livrer sa propre commande'; END IF;
    IF NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = p_driver_id AND (is_available OR p_driver_id = o.seller_id)) THEN
      RAISE EXCEPTION 'Ce livreur n''est pas disponible';
    END IF;
  END IF;

  -- (GREATEST ignores NULL, so test it first: no distance given = estimate from the cities / GPS)
  v_km := CASE WHEN p_distance_km IS NULL THEN public.estimate_delivery_km(o.id) ELSE LEAST(GREATEST(p_distance_km, 1), 300) END;
  v_night := extract(hour FROM now() AT TIME ZONE 'UTC') >= 19 OR extract(hour FROM now() AT TIME ZONE 'UTC') < 6;
  SELECT * INTO pr FROM public.calculate_delivery_price(v_km, v_night, p_vehicle);

  IF o.payment_status = 'cod_pending' THEN
    v_cash := o.total_price + pr.total;
  ELSIF o.buyer_id = auth.uid() THEN
    UPDATE wallets SET balance = balance - pr.total, updated_at = now() WHERE user_id = o.buyer_id AND balance >= pr.total;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant pour la livraison (% FCFA) : rechargez votre portefeuille', round(pr.total); END IF;
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
    VALUES (o.buyer_id, 'purchase', -pr.total, 'Livraison commande #' || left(o.id::text, 8), o.id, 'wallet', 'completed');
    v_held := true;
  END IF;

  INSERT INTO delivery_requests (order_id, driver_id, buyer_id, seller_id, status, vehicle_type, distance_km, base_price, commission,
    night_surcharge, surcharge_amount, total_delivery_price, delivery_address, cash_to_collect, fee_held)
  VALUES (o.id, p_driver_id, o.buyer_id, o.seller_id, 'pending', p_vehicle, v_km, pr.base_price, round(pr.commission),
    v_night, pr.surcharge, round(pr.total), o.shipping_address, round(v_cash), v_held)
  RETURNING id INTO v_id;

  IF p_driver_id IS NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT dp.user_id, 'delivery_request', 'Nouvelle course disponible 🚚',
      'Course de ' || v_km || ' km' || CASE WHEN v_cash > 0 THEN ' · paiement à la livraison : ' || round(v_cash) || ' FCFA à encaisser' ELSE '' END,
      jsonb_build_object('delivery_id', v_id, 'order_id', o.id)
    FROM driver_profiles dp WHERE dp.is_available AND dp.user_id NOT IN (o.buyer_id) LIMIT 200;
  END IF;
  RETURN jsonb_build_object('success', true, 'delivery_id', v_id, 'price', round(pr.total), 'distance_km', v_km, 'cash_to_collect', round(v_cash));
END $$;
REVOKE EXECUTE ON FUNCTION public.request_driver(uuid, uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_driver(uuid, uuid, text, numeric) TO authenticated;

-- 4. The driver refuses (e.g. does not want to collect cash). The buyer gets the fee back and picks someone else.
CREATE OR REPLACE FUNCTION public.decline_delivery(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delivery_requests;
BEGIN
  SELECT * INTO d FROM delivery_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR d.driver_id IS DISTINCT FROM auth.uid() OR d.status <> 'pending' THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  PERFORM public._release_delivery(d, 'declined', left(p_reason, 300));
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (d.buyer_id, 'delivery', 'Livreur indisponible',
    'Le livreur a refusé la course' || CASE WHEN d.cash_to_collect > 0 THEN ' avec paiement à la livraison' ELSE '' END ||
    '. Choisissez un autre livreur.', jsonb_build_object('order_id', d.order_id));
  RETURN jsonb_build_object('success', true);
END $$;

-- The buyer cancels a request nobody has accepted yet.
CREATE OR REPLACE FUNCTION public.cancel_delivery_request(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delivery_requests;
BEGIN
  SELECT * INTO d FROM delivery_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT (d.buyer_id = auth.uid() OR public.can_manage_seller(d.seller_id)) THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF d.status <> 'pending' THEN RAISE EXCEPTION 'Le livreur a déjà accepté : contactez-le via la messagerie'; END IF;
  PERFORM public._release_delivery(d, 'cancelled', NULL);
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public._release_delivery(d delivery_requests, p_status text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE delivery_requests SET status = p_status, declined_reason = p_reason, cancelled_at = now(), fee_held = false WHERE id = d.id;
  IF d.fee_held AND d.total_delivery_price > 0 THEN
    UPDATE wallets SET balance = balance + d.total_delivery_price, updated_at = now() WHERE user_id = d.buyer_id;
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
    VALUES (d.buyer_id, 'refund', d.total_delivery_price, 'Livraison remboursée #' || left(d.order_id::text, 8), d.order_id, 'completed');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._release_delivery(delivery_requests, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decline_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_delivery(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_delivery_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_delivery_request(uuid) TO authenticated;

-- 5. Accepting a cash course: the driver must not already hold too much unreturned cash.
CREATE OR REPLACE FUNCTION public.accept_delivery(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delivery_requests; v_owed numeric;
BEGIN
  PERFORM public.require_space('driver');
  IF NOT public.hit_rate_limit('accept_delivery:' || auth.uid(), 60, 3600) THEN RAISE EXCEPTION 'Trop de tentatives, réessayez plus tard'; END IF;
  SELECT * INTO d FROM delivery_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' OR (d.driver_id IS NOT NULL AND d.driver_id <> auth.uid()) THEN RAISE EXCEPTION 'Cette course n''est plus disponible'; END IF;
  IF d.buyer_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas livrer votre propre achat'; END IF;
  IF NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = auth.uid() AND (is_available OR auth.uid() = d.seller_id)) THEN
    RAISE EXCEPTION 'Passez en mode disponible pour accepter une course';
  END IF;
  IF d.cash_to_collect > 0 AND auth.uid() <> d.seller_id THEN
    SELECT COALESCE(commission_balance, 0) INTO v_owed FROM driver_profiles WHERE user_id = auth.uid();
    IF v_owed > 150000 THEN RAISE EXCEPTION 'Reversez d''abord l''argent déjà encaissé (% FCFA) avant une nouvelle course en espèces', round(v_owed); END IF;
  END IF;
  UPDATE delivery_requests SET driver_id = auth.uid(), status = 'accepted', accepted_at = now() WHERE id = p_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (d.buyer_id, 'delivery', 'Livreur trouvé',
    'Un livreur a accepté votre livraison' || CASE WHEN d.cash_to_collect > 0 THEN ' : vous payez ' || round(d.cash_to_collect) || ' FCFA à la remise, contre votre code.' ELSE '.' END,
    jsonb_build_object('delivery_id', d.id, 'order_id', d.order_id));
  RETURN jsonb_build_object('success', true);
END $$;

-- 6. Cash handover. Seller (or no driver): the seller collected the cash, the commission is taken
--    from their wallet. Another driver collected it: the seller is paid on the platform and the
--    driver now owes the order amount plus the delivery commission until they hand it back.
CREATE OR REPLACE FUNCTION public.confirm_handover(p_order_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; c order_codes; d delivery_requests; v_driver uuid; v_comm numeric;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  SELECT * INTO d FROM delivery_requests WHERE order_id = p_order_id AND status IN ('accepted','picked_up','delivered') ORDER BY created_at DESC LIMIT 1;
  v_driver := d.driver_id;
  IF NOT (public.can_manage_seller(o.seller_id) OR auth.uid() = v_driver
          OR (o.pickup_point_id IS NOT NULL AND to_regclass('public.pickup_points') IS NOT NULL AND public.is_pickup_partner(o.pickup_point_id))) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  SELECT * INTO c FROM order_codes WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pas de code pour cette commande'; END IF;
  IF c.used_at IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'already', true); END IF;
  IF c.attempts >= 5 THEN RAISE EXCEPTION 'Trop d''essais : contactez le support'; END IF;
  IF c.code <> trim(COALESCE(p_code, '')) THEN
    UPDATE order_codes SET attempts = attempts + 1 WHERE order_id = p_order_id;
    RETURN jsonb_build_object('success', false, 'error', 'Code incorrect', 'attempts_left', 4 - c.attempts);
  END IF;
  UPDATE order_codes SET used_at = now() WHERE order_id = p_order_id;

  IF o.payment_mode = 'cod' THEN
    v_comm := o.total_price - round(o.total_price * 0.9);
    UPDATE orders SET status = 'completed', payment_status = 'paid', delivery_status = 'delivered', actual_delivery = now() WHERE id = o.id;
    UPDATE payments SET status = 'completed' WHERE order_id = o.id;
    INSERT INTO wallets (user_id) VALUES (o.seller_id) ON CONFLICT (user_id) DO NOTHING;
    IF v_driver IS NOT NULL AND v_driver <> o.seller_id THEN
      UPDATE wallets SET balance = balance + (o.total_price - v_comm), total_earned = total_earned + (o.total_price - v_comm), updated_at = now() WHERE user_id = o.seller_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
      VALUES (o.seller_id, 'escrow_release', o.total_price - v_comm, 'Vente payée à la livraison #' || left(o.id::text, 8), o.id, 'completed');
      UPDATE driver_profiles SET commission_balance = COALESCE(commission_balance, 0) + o.total_price + COALESCE(d.commission, 0) WHERE user_id = v_driver;
      INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_driver, 'delivery', 'Espèces à reverser',
        'Vous avez encaissé ' || round(o.total_price + COALESCE(d.total_delivery_price, 0)) || ' FCFA. Gardez votre livraison (' ||
        round(COALESCE(d.total_delivery_price, 0) - COALESCE(d.commission, 0)) || ' FCFA) et reversez ' || round(o.total_price + COALESCE(d.commission, 0)) || ' FCFA depuis votre portefeuille.',
        jsonb_build_object('order_id', o.id));
    ELSE
      UPDATE wallets SET balance = balance - v_comm, updated_at = now() WHERE user_id = o.seller_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
      VALUES (o.seller_id, 'commission', -v_comm, 'Commission paiement à la livraison #' || left(o.id::text, 8), o.id, 'completed');
    END IF;
    INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status, released_at)
    VALUES (o.id, o.buyer_id, o.total_price, o.total_price - v_comm, v_comm, 'released', now());
  ELSE
    UPDATE orders SET status = 'shipped', delivery_status = 'delivered', actual_delivery = now() WHERE id = o.id AND status NOT IN ('completed','cancelled');
  END IF;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'order', 'Commande remise',
    'La remise de la commande #' || left(o.id::text, 8) || ' est confirmée.' ||
    CASE WHEN o.payment_mode <> 'cod' THEN ' Confirmez la réception pour libérer le paiement.' ELSE '' END, jsonb_build_object('order_id', o.id));
  RETURN jsonb_build_object('success', true);
END $$;

-- 7. Release on reception: the driver is paid only when the buyer prepaid the delivery fee
--    (before, the driver was credited even when the fee had been paid in cash).
CREATE OR REPLACE FUNCTION public.confirm_order_reception(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders; v_escrow escrow_transactions; v_delivery delivery_requests; v_seller_amount numeric; v_driver_amount numeric;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND buyer_id = auth.uid() AND status = 'shipped' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or not authorized'; END IF;
  UPDATE orders SET status = 'completed', delivery_status = 'delivered', updated_at = now() WHERE id = p_order_id;
  SELECT * INTO v_escrow FROM escrow_transactions WHERE order_id = p_order_id AND status = 'held' FOR UPDATE;
  IF FOUND THEN
    UPDATE escrow_transactions SET status = 'released', released_at = now() WHERE id = v_escrow.id;
    v_seller_amount := COALESCE(v_escrow.seller_amount, v_order.total_price * 0.9);
    INSERT INTO wallets (user_id, balance, total_earned) VALUES (v_order.seller_id, v_seller_amount, v_seller_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_seller_amount, total_earned = wallets.total_earned + v_seller_amount, updated_at = now();
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id)
    VALUES (v_order.seller_id, 'escrow_release', v_seller_amount, 'Vente commande #' || left(p_order_id::text, 8), p_order_id);
  END IF;
  SELECT * INTO v_delivery FROM delivery_requests WHERE order_id = p_order_id AND status = 'delivered' AND fee_held ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND AND v_delivery.driver_id IS NOT NULL THEN
    v_driver_amount := COALESCE(v_delivery.total_delivery_price, 0) - COALESCE(v_delivery.commission, 0);
    UPDATE delivery_requests SET fee_held = false WHERE id = v_delivery.id;
    IF v_driver_amount > 0 THEN
      INSERT INTO wallets (user_id, balance, total_earned) VALUES (v_delivery.driver_id, v_driver_amount, v_driver_amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_driver_amount, total_earned = wallets.total_earned + v_driver_amount, updated_at = now();
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id)
      VALUES (v_delivery.driver_id, 'escrow_release', v_driver_amount, 'Livraison commande #' || left(p_order_id::text, 8), p_order_id);
    END IF;
  END IF;
END $$;

-- 8. The driver hands back collected cash from their wallet.
CREATE OR REPLACE FUNCTION public.settle_driver_cash(p_amount numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owed numeric; v_amt numeric;
BEGIN
  PERFORM public.require_space('driver');
  SELECT COALESCE(commission_balance, 0) INTO v_owed FROM driver_profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF COALESCE(v_owed, 0) <= 0 THEN RAISE EXCEPTION 'Rien à reverser'; END IF;
  v_amt := round(LEAST(COALESCE(p_amount, v_owed), v_owed));
  IF v_amt <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  UPDATE wallets SET balance = balance - v_amt, updated_at = now() WHERE user_id = auth.uid() AND balance >= v_amt;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant : rechargez votre portefeuille'; END IF;
  INSERT INTO wallet_transactions (user_id, type, amount, description, status) VALUES (auth.uid(), 'commission', -v_amt, 'Reversement des espèces encaissées', 'completed');
  UPDATE driver_profiles SET commission_balance = commission_balance - v_amt WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true, 'paid', v_amt, 'remaining', v_owed - v_amt);
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_driver_cash(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_driver_cash(numeric) TO authenticated;
