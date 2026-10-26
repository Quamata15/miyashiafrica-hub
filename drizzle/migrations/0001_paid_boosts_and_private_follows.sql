CREATE OR REPLACE FUNCTION public.purchase_boost(
  p_boost_type text, p_target_id uuid, p_target_name text, p_zone_radius_km integer,
  p_period text, p_description text DEFAULT NULL, p_creative_url text DEFAULT NULL,
  p_creative_type text DEFAULT 'none', p_campaign_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric; v_days integer; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT x.price, x.days INTO v_price, v_days FROM (VALUES
    ('weekly',2500,7),('monthly',5000,30),('quarterly',10000,90),
    ('semi_annual',15000,180),('annual',25000,365)) AS x(id,price,days)
  WHERE x.id = p_period;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Invalid period'; END IF;
  IF p_zone_radius_km < 1 OR p_zone_radius_km > 1000 THEN RAISE EXCEPTION 'Invalid radius'; END IF;
  IF p_campaign_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM campaigns WHERE id = p_campaign_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  UPDATE wallets SET balance = balance - v_price, updated_at = now()
  WHERE user_id = v_uid AND balance >= v_price;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_uid, 'boost_payment', -v_price, 'Achat boost ' || p_period, 'completed');

  INSERT INTO boosts (user_id, boost_type, target_id, target_name, zone_radius_km, period, price_paid,
    starts_at, expires_at, is_active, description, creative_url, creative_type, campaign_id)
  VALUES (v_uid, p_boost_type, COALESCE(p_target_id, v_uid), left(p_target_name, 200), p_zone_radius_km, p_period, v_price,
    now(), now() + make_interval(days => v_days), true, left(p_description, 1000), p_creative_url, COALESCE(p_creative_type,'none'), p_campaign_id)
  RETURNING id INTO v_id;

  IF p_campaign_id IS NOT NULL THEN
    UPDATE campaigns SET budget_spent = budget_spent + v_price, boosts_count = COALESCE(boosts_count,0) + 1
    WHERE id = p_campaign_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.purchase_boost(text, uuid, text, integer, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_boost(text, uuid, text, integer, text, text, text, text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can manage own boosts" ON public.boosts;
CREATE POLICY "Users can view own boosts" ON public.boosts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boosts" ON public.boosts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can see follows" ON public.follows;
CREATE POLICY "Users see their own follows" ON public.follows FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = followed_id);