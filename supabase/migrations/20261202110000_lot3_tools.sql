-- Lot 3: tools for sellers and providers, local-language search, fraud signals, sanctions, ambassadors.

-------------------------------------------------------------------------------
-- 1. Provider agenda feed (Google Agenda subscription).
-------------------------------------------------------------------------------
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS calendar_token text UNIQUE;
CREATE OR REPLACE FUNCTION public.my_calendar_token(p_reset boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  PERFORM public.require_space('provider');
  INSERT INTO provider_profiles (user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  SELECT calendar_token INTO v FROM provider_profiles WHERE user_id = auth.uid();
  IF v IS NULL OR p_reset THEN
    v := encode(extensions.gen_random_bytes(24), 'hex');
    UPDATE provider_profiles SET calendar_token = v WHERE user_id = auth.uid();
  END IF;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public.my_calendar_token(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_calendar_token(boolean) TO authenticated;

-------------------------------------------------------------------------------
-- 2. Seller insights: viewed but not bought, peak hours, average basket, conversion.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seller_insights(p_seller uuid DEFAULT NULL, p_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller uuid := COALESCE(p_seller, auth.uid()); v_from timestamptz := now() - make_interval(days => LEAST(GREATEST(p_days, 1), 365));
  r jsonb; v_views bigint; v_orders bigint; v_basket numeric; v_hours jsonb; v_cold jsonb; v_days jsonb;
BEGIN
  IF NOT public.can_manage_seller(v_seller) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT count(*) INTO v_views FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = v_seller AND v.viewed_at >= v_from;
  SELECT count(*), COALESCE(round(avg(total_price)), 0) INTO v_orders, v_basket FROM orders
  WHERE seller_id = v_seller AND created_at >= v_from AND status NOT IN ('cancelled','refunded') AND payment_status IN ('paid','cod_pending');
  SELECT jsonb_agg(COALESCE(c, 0) ORDER BY h) INTO v_hours FROM generate_series(0, 23) h
  LEFT JOIN (SELECT extract(hour FROM created_at AT TIME ZONE 'Africa/Lome')::int hh, count(*) c FROM orders
             WHERE seller_id = v_seller AND created_at >= v_from AND status NOT IN ('cancelled','refunded') GROUP BY 1) o ON o.hh = h;
  SELECT jsonb_agg(COALESCE(c, 0) ORDER BY d) INTO v_days FROM generate_series(0, 6) d
  LEFT JOIN (SELECT extract(dow FROM created_at AT TIME ZONE 'Africa/Lome')::int dd, count(*) c FROM orders
             WHERE seller_id = v_seller AND created_at >= v_from AND status NOT IN ('cancelled','refunded') GROUP BY 1) o ON o.dd = d;
  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'views')::int DESC), '[]') INTO v_cold FROM (
    SELECT jsonb_build_object('id', p.id, 'title', p.title, 'price', p.price, 'views', count(v.id),
      'orders', (SELECT count(*) FROM orders o WHERE o.product_id = p.id AND o.created_at >= v_from AND o.status NOT IN ('cancelled','refunded'))) x
    FROM products p JOIN product_views v ON v.product_id = p.id AND v.viewed_at >= v_from
    WHERE p.seller_id = v_seller AND p.is_active GROUP BY p.id
    HAVING count(v.id) >= 5 AND (SELECT count(*) FROM orders o WHERE o.product_id = p.id AND o.created_at >= v_from AND o.status NOT IN ('cancelled','refunded')) * 20 < count(v.id)
    ORDER BY count(v.id) DESC LIMIT 5) t;
  RETURN jsonb_build_object('views', v_views, 'orders', v_orders, 'avg_basket', v_basket,
    'conversion', CASE WHEN v_views > 0 THEN round(v_orders * 100.0 / v_views, 1) ELSE 0 END,
    'orders_by_hour', v_hours, 'orders_by_weekday', v_days, 'viewed_not_bought', v_cold);
END $$;
REVOKE EXECUTE ON FUNCTION public.seller_insights(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_insights(uuid, int) TO authenticated;

-------------------------------------------------------------------------------
-- 3. VAT by country and accounting export.
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vat_rates (country text PRIMARY KEY, rate numeric NOT NULL CHECK (rate BETWEEN 0 AND 30), label text NOT NULL, note text);
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "VAT rates are public" ON public.vat_rates;
CREATE POLICY "VAT rates are public" ON public.vat_rates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin edits VAT" ON public.vat_rates;
CREATE POLICY "Admin edits VAT" ON public.vat_rates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.vat_rates (country, rate, label, note) VALUES
 ('TG',18,'TVA','Taux standard'),('BJ',18,'TVA','Taux standard'),('CI',18,'TVA','Taux standard'),('SN',18,'TVA','Taux standard'),
 ('BF',18,'TVA','Taux standard'),('ML',18,'TVA','Taux standard'),('NE',19,'TVA','Taux standard'),('GN',18,'TVA','Taux standard'),
 ('CM',19.25,'TVA','Taux standard, centimes additionnels compris'),('GA',18,'TVA','Taux standard'),('CG',18,'TVA','Taux standard'),
 ('TD',18,'TVA','Taux standard'),('CF',19,'TVA','Taux standard'),('GH',15,'VAT','Taux standard, hors prélèvements NHIL/GETFund'),('NG',7.5,'VAT','Taux standard')
ON CONFLICT (country) DO NOTHING;

-- One line per sale: amounts excluding tax, tax, including tax, commission, net. VAT applies when the shop has a tax number.
CREATE OR REPLACE FUNCTION public.accounting_export(p_from date, p_to date, p_seller uuid DEFAULT NULL)
RETURNS TABLE (order_date date, order_ref text, label text, payment text, total_ttc numeric, vat_rate numeric, total_ht numeric, vat numeric, commission numeric, net numeric, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller uuid := COALESCE(p_seller, auth.uid()); v_rate numeric := 0; s shops;
BEGIN
  IF NOT public.can_manage_seller(v_seller) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF p_to < p_from OR p_to - p_from > 400 THEN RAISE EXCEPTION 'Période invalide (13 mois maximum)'; END IF;
  SELECT * INTO s FROM shops WHERE owner_id = v_seller;
  IF s.vat_number IS NOT NULL AND btrim(s.vat_number) <> '' THEN SELECT rate INTO v_rate FROM vat_rates WHERE country = COALESCE(s.country, 'TG'); END IF;
  v_rate := COALESCE(v_rate, 0);
  RETURN QUERY
  SELECT (o.created_at AT TIME ZONE 'Africa/Lome')::date, left(o.id::text, 8), COALESCE(p.title, sv.title, 'Commande'), o.payment_mode,
    o.total_price, v_rate, round(o.total_price / (1 + v_rate / 100)), o.total_price - round(o.total_price / (1 + v_rate / 100)),
    COALESCE(e.platform_commission, o.total_price - round(o.total_price * 0.9)), o.total_price - COALESCE(e.platform_commission, o.total_price - round(o.total_price * 0.9)), o.status
  FROM orders o LEFT JOIN products p ON p.id = o.product_id LEFT JOIN services sv ON sv.id = o.service_id
  LEFT JOIN LATERAL (SELECT platform_commission FROM escrow_transactions x WHERE x.order_id = o.id ORDER BY created_at DESC LIMIT 1) e ON true
  WHERE o.seller_id = v_seller AND (o.created_at AT TIME ZONE 'Africa/Lome')::date BETWEEN p_from AND p_to AND o.status NOT IN ('cancelled')
  ORDER BY o.created_at;
END $$;
REVOKE EXECUTE ON FUNCTION public.accounting_export(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accounting_export(date, date, uuid) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Local-language words for search (Éwé, Fon, Wolof, Dioula -> French). Admin can add more.
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id serial PRIMARY KEY, term text NOT NULL, lang text NOT NULL CHECK (lang IN ('ewe','fon','wolof','dioula','mina','yoruba','haoussa','autre')),
  means text NOT NULL, verified boolean NOT NULL DEFAULT false,
  key text GENERATED ALWAYS AS (lower(public.f_unaccent(term))) STORED
);
CREATE UNIQUE INDEX IF NOT EXISTS search_synonyms_key ON public.search_synonyms (key, lang);
ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Synonyms are public" ON public.search_synonyms;
CREATE POLICY "Synonyms are public" ON public.search_synonyms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin edits synonyms" ON public.search_synonyms;
CREATE POLICY "Admin edits synonyms" ON public.search_synonyms FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.search_synonyms (term, lang, means) VALUES
 ('ceeb','wolof','riz'),('jën','wolof','poisson'),('yàpp','wolof','viande'),('mburu','wolof','pain'),('meew','wolof','lait'),('nen','wolof','oeuf'),('dàll','wolof','chaussures'),('mbubb','wolof','boubou'),
 ('mɔli','ewe','riz'),('moli','ewe','riz'),('akpa','ewe','poisson'),('lã','ewe','viande'),('abolo','ewe','pain'),('avɔ','ewe','pagne'),('avo','ewe','pagne'),('afɔkpa','ewe','chaussures'),('afokpa','ewe','chaussures'),
 ('mɔlikun','fon','riz'),('molikun','fon','riz'),('hwevi','fon','poisson'),('lan','fon','viande'),
 ('malo','dioula','riz'),('jɛgɛ','dioula','poisson'),('jege','dioula','poisson'),('sogo','dioula','viande'),('buru','dioula','pain'),('fini','dioula','pagne'),('sabara','dioula','chaussures')
ON CONFLICT (key, lang) DO NOTHING;

-------------------------------------------------------------------------------
-- 5. Fraud signals for the admin.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fraud_signals()
RETURNS TABLE (user_id uuid, name text, signal text, value numeric, detail text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé à l''administrateur'; END IF;
  RETURN QUERY
  WITH shared AS (   -- same delivery phone used by 3 accounts or more
    SELECT regexp_replace(a.phone, '\D', '', 'g') ph, array_agg(DISTINCT a.user_id) users FROM addresses a
    WHERE length(regexp_replace(COALESCE(a.phone, ''), '\D', '', 'g')) >= 8 GROUP BY 1 HAVING count(DISTINCT a.user_id) >= 3
  ), cancels AS (
    SELECT o.seller_id uid, count(*) FILTER (WHERE o.status = 'cancelled') c, count(*) t FROM orders o
    WHERE o.created_at > now() - interval '60 days' GROUP BY 1 HAVING count(*) >= 5 AND count(*) FILTER (WHERE o.status = 'cancelled') * 100 >= 30 * count(*)
  ), disputers AS (
    SELECT d.opened_by uid, count(*) c FROM disputes d WHERE d.created_at > now() - interval '90 days' GROUP BY 1 HAVING count(*) >= 3
  ), contacts AS (
    SELECT cv.user_id uid, count(*) c FROM contact_violations cv WHERE cv.created_at > now() - interval '30 days' GROUP BY 1 HAVING count(*) >= 2
  ), rows AS (
    SELECT unnest(s.users) uid, 'Téléphone de livraison partagé'::text sig, cardinality(s.users)::numeric v, 'Même numéro sur ' || cardinality(s.users) || ' comptes' det FROM shared s
    UNION ALL SELECT c.uid, 'Annulations vendeur', round(c.c * 100.0 / c.t), c.c || ' annulations sur ' || c.t || ' commandes (60 j)' FROM cancels c
    UNION ALL SELECT d.uid, 'Litiges ouverts en série', d.c, d.c || ' litiges en 90 jours' FROM disputers d
    UNION ALL SELECT c.uid, 'Échange de coordonnées', c.c, c.c || ' tentatives en 30 jours' FROM contacts c
    UNION ALL SELECT r.user_id, 'Score de risque élevé', r.score, COALESCE((SELECT string_agg(x->>'signal', ', ') FROM jsonb_array_elements(r.signals) x), '') FROM user_risk_scores r WHERE r.score >= 40
  )
  SELECT rw.uid, COALESCE(NULLIF(pr.username, ''), pr.full_name, 'Compte'), rw.sig, rw.v, rw.det
  FROM rows rw LEFT JOIN profiles pr ON pr.user_id = rw.uid ORDER BY rw.v DESC LIMIT 300;
END $$;
REVOKE EXECUTE ON FUNCTION public.fraud_signals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fraud_signals() TO authenticated;

-------------------------------------------------------------------------------
-- 6. Sanctions: warning, listings suspended, account suspended, lifted.
-------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until timestamptz, ADD COLUMN IF NOT EXISTS suspension_kind text;
CREATE TABLE IF NOT EXISTS public.sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('warning','listings_suspended','account_suspended','lifted')),
  days int, note text, violation_id uuid, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own and admin sanctions" ON public.sanctions;
CREATE POLICY "Own and admin sanctions" ON public.sanctions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.apply_sanction(p_user uuid, p_kind text, p_days int DEFAULT NULL, p_note text DEFAULT NULL, p_violation_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_until timestamptz;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé à l''administrateur'; END IF;
  IF p_kind NOT IN ('warning','listings_suspended','account_suspended','lifted') THEN RAISE EXCEPTION 'Sanction inconnue'; END IF;
  IF public.has_role(p_user, 'admin') THEN RAISE EXCEPTION 'Impossible de sanctionner un administrateur'; END IF;
  v_until := CASE WHEN p_kind IN ('listings_suspended','account_suspended') THEN now() + make_interval(days => LEAST(GREATEST(COALESCE(p_days, 7), 1), 3650)) END;
  INSERT INTO sanctions (user_id, kind, days, note, violation_id) VALUES (p_user, p_kind, p_days, left(p_note, 1000), p_violation_id);
  IF p_kind = 'lifted' THEN
    UPDATE profiles SET suspended_until = NULL, suspension_kind = NULL WHERE user_id = p_user;
  ELSIF v_until IS NOT NULL THEN
    UPDATE profiles SET suspended_until = v_until, suspension_kind = p_kind WHERE user_id = p_user;
    UPDATE products SET is_active = false WHERE seller_id = p_user AND is_active;
    UPDATE services SET is_active = false WHERE provider_id = p_user AND is_active;
    UPDATE jobs SET is_active = false WHERE employer_id = p_user AND is_active;
  END IF;
  IF p_violation_id IS NOT NULL THEN
    UPDATE vendor_violations SET status = 'actioned', penalty_applied = p_kind, admin_notes = left(p_note, 1000), reviewed_at = now() WHERE id = p_violation_id;
  END IF;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (p_user, 'warning',
    CASE p_kind WHEN 'warning' THEN 'Avertissement' WHEN 'listings_suspended' THEN 'Annonces suspendues' WHEN 'account_suspended' THEN 'Compte suspendu' ELSE 'Sanction levée' END,
    CASE p_kind WHEN 'lifted' THEN 'Vous pouvez de nouveau publier.' ELSE COALESCE(left(p_note, 300), 'Non-respect des règles de MIYASHI.') ||
      CASE WHEN v_until IS NOT NULL THEN ' Jusqu''au ' || to_char(v_until, 'DD/MM/YYYY') || '.' ELSE '' END END, '{}'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_sanction(uuid, text, int, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_sanction(uuid, text, int, text, uuid) TO authenticated;

-- While suspended: no listing goes back online; a suspended account cannot send messages either.
CREATE OR REPLACE FUNCTION public.guard_suspended() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_owner uuid; v_kind text;
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.is_admin() THEN RETURN NEW; END IF;
  v_owner := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  SELECT suspension_kind INTO v_kind FROM profiles WHERE user_id = v_owner AND suspended_until > now();
  IF v_kind IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'messages' THEN
    IF v_kind = 'account_suspended' THEN RAISE EXCEPTION 'Compte suspendu : la messagerie est désactivée'; END IF;
    RETURN NEW;
  END IF;
  IF COALESCE((to_jsonb(NEW) ->> 'is_active')::boolean, true) THEN RAISE EXCEPTION 'Vos annonces sont suspendues jusqu''à nouvel ordre'; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT * FROM (VALUES ('products','seller_id'),('services','provider_id'),('jobs','employer_id'),('messages','sender_id')) v(tbl, col) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_suspended ON public.%I', t.tbl);
    EXECUTE format('CREATE TRIGGER guard_suspended BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_suspended(%L)', t.tbl, t.col);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_suspended() FROM PUBLIC, anon, authenticated;

-------------------------------------------------------------------------------
-- 7. Ambassadors: bonuses when a referred person becomes an active seller or a pickup point.
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ambassador_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referrer_id uuid NOT NULL, referred_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('first_sale','pickup_point')), amount numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_id, kind)
);
ALTER TABLE public.ambassador_bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own ambassador bonuses" ON public.ambassador_bonuses;
CREATE POLICY "Own ambassador bonuses" ON public.ambassador_bonuses FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public._ambassador_bonus(p_referred uuid, p_kind text, p_amount numeric, p_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref uuid;
BEGIN
  SELECT referrer_id INTO v_ref FROM referral_rewards WHERE referred_id = p_referred LIMIT 1;
  IF v_ref IS NULL THEN RETURN; END IF;
  INSERT INTO ambassador_bonuses (referrer_id, referred_id, kind, amount) VALUES (v_ref, p_referred, p_kind, p_amount) ON CONFLICT (referred_id, kind) DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO wallets (user_id) VALUES (v_ref) ON CONFLICT (user_id) DO NOTHING;
  UPDATE wallets SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now() WHERE user_id = v_ref;
  INSERT INTO wallet_transactions (user_id, type, amount, description, status) VALUES (v_ref, 'referral_bonus', p_amount, 'Bonus ambassadeur : ' || p_label, 'completed');
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_ref, 'wallet', 'Bonus ambassadeur 🎉', p_label || ' : ' || p_amount || ' FCFA crédités.', '{}'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public._ambassador_bonus(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_on_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.seller_id = NEW.seller_id AND o.status = 'completed' AND o.id <> NEW.id) THEN
    PERFORM public._ambassador_bonus(NEW.seller_id, 'first_sale', 2000, 'votre filleul a fait sa première vente');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS ambassador_on_order ON public.orders;
CREATE TRIGGER ambassador_on_order AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.ambassador_on_order();

CREATE OR REPLACE FUNCTION public.ambassador_on_pickup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM public._ambassador_bonus(NEW.user_id, 'pickup_point', 5000, 'votre filleul est devenu point relais');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS ambassador_on_pickup ON public.pickup_partner_applications;
CREATE TRIGGER ambassador_on_pickup AFTER UPDATE OF status ON public.pickup_partner_applications FOR EACH ROW EXECUTE FUNCTION public.ambassador_on_pickup();
REVOKE EXECUTE ON FUNCTION public.ambassador_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ambassador_on_pickup() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  RETURN jsonb_build_object(
    'code', (SELECT code FROM referral_codes WHERE user_id = auth.uid()),
    'referred', (SELECT count(*) FROM referral_rewards WHERE referrer_id = auth.uid()),
    'sellers', (SELECT count(*) FROM referral_rewards r WHERE r.referrer_id = auth.uid() AND public.has_role(r.referred_id, 'seller')),
    'active_sellers', (SELECT count(*) FROM ambassador_bonuses b WHERE b.referrer_id = auth.uid() AND b.kind = 'first_sale'),
    'pickup_points', (SELECT count(*) FROM ambassador_bonuses b WHERE b.referrer_id = auth.uid() AND b.kind = 'pickup_point'),
    'earned', COALESCE((SELECT sum(referrer_reward) FROM referral_rewards WHERE referrer_id = auth.uid()), 0)
              + COALESCE((SELECT sum(amount) FROM ambassador_bonuses WHERE referrer_id = auth.uid()), 0));
END $$;
REVOKE EXECUTE ON FUNCTION public.my_ambassador_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_ambassador_stats() TO authenticated;

-- Internal functions of lot 3 core (triggers and jobs) are not API endpoints.
REVOKE EXECUTE ON FUNCTION public.cleanup_guests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.savings_reminders() FROM PUBLIC, anon, authenticated;
