-- The delivery fee was debited unrounded (e.g. 3437.50 with the night surcharge) but recorded
-- and refunded rounded (3438): a cancelled ride gave the buyer 0.50 too much. One rounded
-- amount is now used everywhere.
CREATE OR REPLACE FUNCTION public.request_driver(p_order_id uuid, p_driver_id uuid DEFAULT NULL, p_vehicle text DEFAULT 'moto', p_distance_km numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; v_km numeric; v_night boolean; pr record; v_id uuid; v_cash numeric := 0; v_held boolean := false; v_fee numeric;
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
  v_fee := round(pr.total);   -- one rounded amount for the debit, the record and the refund

  IF o.payment_status = 'cod_pending' THEN
    v_cash := o.total_price + v_fee;
  ELSIF o.buyer_id = auth.uid() THEN
    UPDATE wallets SET balance = balance - v_fee, updated_at = now() WHERE user_id = o.buyer_id AND balance >= v_fee;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant pour la livraison (% FCFA) : rechargez votre portefeuille', v_fee; END IF;
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
    VALUES (o.buyer_id, 'purchase', -v_fee, 'Livraison commande #' || left(o.id::text, 8), o.id, 'wallet', 'completed');
    v_held := true;
  END IF;

  INSERT INTO delivery_requests (order_id, driver_id, buyer_id, seller_id, status, vehicle_type, distance_km, base_price, commission,
    night_surcharge, surcharge_amount, total_delivery_price, delivery_address, cash_to_collect, fee_held)
  VALUES (o.id, p_driver_id, o.buyer_id, o.seller_id, 'pending', p_vehicle, v_km, pr.base_price, round(pr.commission),
    v_night, pr.surcharge, v_fee, o.shipping_address, round(v_cash), v_held)
  RETURNING id INTO v_id;

  IF p_driver_id IS NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT dp.user_id, 'delivery_request', 'Nouvelle course disponible 🚚',
      'Course de ' || v_km || ' km' || CASE WHEN v_cash > 0 THEN ' · paiement à la livraison : ' || round(v_cash) || ' FCFA à encaisser' ELSE '' END,
      jsonb_build_object('delivery_id', v_id, 'order_id', o.id)
    FROM driver_profiles dp WHERE dp.is_available AND dp.user_id NOT IN (o.buyer_id) LIMIT 200;
  END IF;
  RETURN jsonb_build_object('success', true, 'delivery_id', v_id, 'price', v_fee, 'distance_km', v_km, 'cash_to_collect', round(v_cash));
END $$;
REVOKE EXECUTE ON FUNCTION public.request_driver(uuid, uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_driver(uuid, uuid, text, numeric) TO authenticated;
