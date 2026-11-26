-- MIYASHI communication, AI, admin and compliance
-- 35 voice messages (message_type 'audio')    36 WhatsApp notifications    38 transactional e-mails
-- 41 fraud signals    42 listing moderation    44 semantic search (pgvector)    45 message translations
-- 46 admin audit log + feature flags    47 banners and home content    48 legal docs, data export
-- 49 health checks, status page, backups
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Calls one of our edge functions from the database with the shared internal secret.
CREATE OR REPLACE FUNCTION public.call_internal_function(p_fn text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_fn NOT IN ('notifications-cron','notify-dispatch','embed','moderate','health','backup-export') THEN
    RAISE EXCEPTION 'Unknown function %', p_fn;
  END IF;
  RETURN net.http_post(
    url := 'https://decycxufopbagjdpejul.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_cron_secret')),
    body := p_body, timeout_milliseconds := 30000);
END $$;
REVOKE EXECUTE ON FUNCTION public.call_internal_function(text, jsonb) FROM PUBLIC, anon, authenticated;

-- ───────────────────────── Notification channels (36, 38) ─────────────────────────
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS cookie_consent jsonb;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  status text NOT NULL,      -- sent | skipped | failed
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see deliveries" ON public.notification_deliveries FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type IN ('order','wallet','offer','quote','booking','group_buy','stock','dispute','payout','shop_invite','security') THEN
    PERFORM public.call_internal_function('notify-dispatch', jsonb_build_object('notification_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS dispatch_notification ON public.notifications;
CREATE TRIGGER dispatch_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification();

-- ───────────────────────── Translations (45) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.message_translations (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  lang text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, lang)
);
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read translations" ON public.message_translations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND (select auth.uid()) IN (m.sender_id, m.receiver_id)));

-- ───────────────────────── Moderation (42) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.banned_keywords (
  keyword text PRIMARY KEY,
  severity text NOT NULL CHECK (severity IN ('block','review')),
  reason text NOT NULL
);
ALTER TABLE public.banned_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage keywords" ON public.banned_keywords FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.banned_keywords (keyword, severity, reason) VALUES
  ('arme à feu','block','Armes interdites'), ('pistolet','block','Armes interdites'), ('munition','block','Armes interdites'),
  ('cocaïne','block','Stupéfiants'), ('héroïne','block','Stupéfiants'), ('tramadol','block','Médicament détourné'),
  ('faux billets','block','Fausse monnaie'), ('organe','review','Possible trafic'), ('ivoire','review','Espèce protégée'),
  ('peau de léopard','block','Espèce protégée'), ('réplique','review','Contrefaçon possible'), ('copie conforme','review','Contrefaçon possible'),
  ('western union','review','Paiement hors plateforme'), ('payez hors','review','Paiement hors plateforme'), ('avance de frais','review','Arnaque possible')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('product','service','user','order','message')),
  target_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('rules','ai','risk','report')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','actioned')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS moderation_flags_open_idx ON public.moderation_flags(status, created_at DESC);
CREATE POLICY "Admins manage flags" ON public.moderation_flags FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.moderate_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_text text; v_hits jsonb; v_block boolean; v_type text := CASE TG_TABLE_NAME WHEN 'products' THEN 'product' ELSE 'service' END;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.title IS NOT DISTINCT FROM OLD.title AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.images IS NOT DISTINCT FROM OLD.images THEN RETURN NEW; END IF;
  v_text := lower(COALESCE(NEW.title,'') || ' ' || COALESCE(NEW.description,''));
  SELECT jsonb_agg(jsonb_build_object('keyword', keyword, 'reason', reason, 'severity', severity)), bool_or(severity = 'block')
  INTO v_hits, v_block FROM banned_keywords WHERE position(keyword IN v_text) > 0;
  IF v_hits IS NOT NULL THEN
    INSERT INTO moderation_flags (target_type, target_id, source, severity, reasons)
    VALUES (v_type, NEW.id, 'rules', CASE WHEN v_block THEN 'high' ELSE 'medium' END, v_hits);
    IF v_block THEN NEW.is_active := false; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS moderate_product ON public.products;
CREATE TRIGGER moderate_product BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.moderate_listing();
DROP TRIGGER IF EXISTS moderate_service ON public.services;
CREATE TRIGGER moderate_service BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.moderate_listing();

-- AI review + embeddings after the row is saved (edge functions skip quietly when not configured).
CREATE OR REPLACE FUNCTION public.after_listing_saved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.title IS NOT DISTINCT FROM OLD.title AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.images IS NOT DISTINCT FROM OLD.images THEN RETURN NULL; END IF;
  PERFORM public.call_internal_function('moderate', jsonb_build_object('type', TG_TABLE_NAME, 'id', NEW.id));
  IF TG_TABLE_NAME = 'products' THEN
    PERFORM public.call_internal_function('embed', jsonb_build_object('product_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS product_after_saved ON public.products;
CREATE TRIGGER product_after_saved AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.after_listing_saved();
DROP TRIGGER IF EXISTS service_after_saved ON public.services;
CREATE TRIGGER service_after_saved AFTER INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.after_listing_saved();

-- ───────────────────────── Fraud signals (41) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.user_risk_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL,
  signals jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see risk" ON public.user_risk_scores FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.compute_user_risk(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s jsonb := '[]'; v_score int := 0; v_age interval; v_phone text; n numeric;
BEGIN
  SELECT now() - created_at INTO v_age FROM auth.users WHERE id = p_user;
  SELECT regexp_replace(COALESCE(phone,''), '\D', '', 'g') INTO v_phone FROM profiles WHERE user_id = p_user;

  SELECT COALESCE(sum(total_price),0) INTO n FROM orders WHERE buyer_id = p_user AND created_at > now() - interval '24 hours';
  IF v_age < interval '3 days' AND n > 200000 THEN v_score := v_score + 30; s := s || jsonb_build_array(jsonb_build_object('signal','new_account_big_spend','value',n)); END IF;

  SELECT count(*) INTO n FROM disputes WHERE against_user = p_user AND created_at > now() - interval '90 days';
  IF n >= 2 THEN v_score := v_score + LEAST(n::int * 10, 30); s := s || jsonb_build_array(jsonb_build_object('signal','disputes_against','value',n)); END IF;

  SELECT count(*) INTO n FROM reports WHERE target_type = 'user' AND target_id = p_user AND created_at > now() - interval '90 days';
  IF n >= 2 THEN v_score := v_score + LEAST(n::int * 8, 24); s := s || jsonb_build_array(jsonb_build_object('signal','reports','value',n)); END IF;

  IF length(v_phone) >= 8 THEN
    SELECT count(*) INTO n FROM profiles WHERE user_id <> p_user AND regexp_replace(COALESCE(phone,''), '\D', '', 'g') = v_phone;
    IF n >= 1 THEN v_score := v_score + 20; s := s || jsonb_build_array(jsonb_build_object('signal','shared_phone','value',n)); END IF;
  END IF;

  SELECT count(*) INTO n FROM fedapay_transactions WHERE user_id = p_user AND status IN ('declined','canceled','failed') AND created_at > now() - interval '24 hours';
  IF n >= 4 THEN v_score := v_score + 15; s := s || jsonb_build_array(jsonb_build_object('signal','failed_payments','value',n)); END IF;

  SELECT count(*) INTO n FROM orders WHERE seller_id = p_user AND status = 'cancelled' AND created_at > now() - interval '30 days';
  IF n >= 5 THEN v_score := v_score + 10; s := s || jsonb_build_array(jsonb_build_object('signal','seller_cancellations','value',n)); END IF;

  SELECT count(*) INTO n FROM moderation_flags WHERE status <> 'dismissed' AND severity = 'high'
    AND target_id IN (SELECT id FROM products WHERE seller_id = p_user UNION SELECT id FROM services WHERE provider_id = p_user);
  IF n >= 1 THEN v_score := v_score + 25; s := s || jsonb_build_array(jsonb_build_object('signal','blocked_listings','value',n)); END IF;

  v_score := LEAST(v_score, 100);
  INSERT INTO user_risk_scores (user_id, score, signals, updated_at) VALUES (p_user, v_score, s, now())
  ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score, signals = EXCLUDED.signals, updated_at = now();
  RETURN jsonb_build_object('score', v_score, 'signals', s);
END $$;
REVOKE EXECUTE ON FUNCTION public.compute_user_risk(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_risk_scores()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT DISTINCT u FROM (
    SELECT buyer_id u FROM orders WHERE created_at > now() - interval '2 days'
    UNION SELECT seller_id FROM orders WHERE created_at > now() - interval '2 days'
    UNION SELECT against_user FROM disputes WHERE created_at > now() - interval '2 days'
    UNION SELECT user_id FROM fedapay_transactions WHERE created_at > now() - interval '2 days'
    UNION SELECT id FROM auth.users WHERE created_at > now() - interval '2 days') x WHERE u IS NOT NULL
  LOOP PERFORM public.compute_user_risk(r.u); n := n + 1; END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_risk_scores() FROM PUBLIC, anon, authenticated;

-- High-value orders from risky buyers are flagged for review.
CREATE OR REPLACE FUNCTION public.flag_risky_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NEW.total_price < 50000 THEN RETURN NULL; END IF;
  v := public.compute_user_risk(NEW.buyer_id);
  IF (v->>'score')::int >= 50 THEN
    INSERT INTO moderation_flags (target_type, target_id, source, severity, reasons)
    VALUES ('order', NEW.id, 'risk', CASE WHEN (v->>'score')::int >= 70 THEN 'high' ELSE 'medium' END, v->'signals');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS flag_risky_order ON public.orders;
CREATE TRIGGER flag_risky_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.flag_risky_order();

-- ───────────────────────── Semantic search (44) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  embedding extensions.vector(384) NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;   -- no policy: service role only
CREATE INDEX IF NOT EXISTS product_embeddings_hnsw ON public.product_embeddings USING hnsw (embedding extensions.vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.semantic_search_products(p_embedding extensions.vector(384), p_count int DEFAULT 24, p_min_similarity float DEFAULT 0.72)
RETURNS TABLE (id uuid, title text, price numeric, images text[], location text, seller_id uuid, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT p.id, p.title, p.price, p.images, p.location, p.seller_id, 1 - (e.embedding <=> p_embedding) AS similarity
  FROM product_embeddings e JOIN products p ON p.id = e.product_id
  WHERE p.is_active AND p.deleted_at IS NULL AND 1 - (e.embedding <=> p_embedding) >= p_min_similarity
  ORDER BY e.embedding <=> p_embedding LIMIT LEAST(GREATEST(p_count,1), 60)
$$;
REVOKE EXECUTE ON FUNCTION public.semantic_search_products(extensions.vector, int, float) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.semantic_search_products(extensions.vector, int, float) TO service_role;

-- ───────────────────────── Feature flags + audit log (46) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  description text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  rollout_percent int NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flags are public" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Admins manage flags" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.feature_flags (key, description) VALUES
  ('direct_mobile_money', 'Paiement mobile money direct au checkout'), ('cash_on_delivery', 'Paiement à la livraison'),
  ('offers', 'Faire une offre / marchander'), ('group_buys', 'Achats groupés'), ('savings', 'Épargne pour un achat'),
  ('voice_search', 'Recherche vocale'), ('image_search', 'Recherche par photo (IA)'), ('semantic_search', 'Recherche par le sens'),
  ('ai_assistant', 'Assistant d''aide IA'), ('ai_listing', 'Rédaction de fiche par IA'), ('translation', 'Traduction des messages'),
  ('video_calls', 'Appels vidéo'), ('voice_messages', 'Messages vocaux'), ('bookings', 'Réservation de créneaux'), ('quotes', 'Devis en ligne')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

-- Logs every change an admin makes on sensitive tables (append-only: no update/delete policy).
CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END; v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RETURN NULL; END IF;
  INSERT INTO admin_audit_log (actor_id, action, target_table, target_id, before, after)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, COALESCE(v_new->>'id', v_old->>'id', v_new->>'key', v_old->>'key', v_new->>'user_id', v_old->>'user_id'), v_old, v_new);
  RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_roles','kyc_documents','products','services','disputes','delivery_zones','pickup_points','feature_flags',
    'currencies','tax_rates','customs_rules','moderation_flags','banned_keywords','faq_items','promo_codes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_admin ON public.%I', t);
    EXECUTE format('CREATE TRIGGER audit_admin AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change()', t);
  END LOOP;
END $$;

-- ───────────────────────── Banners and home content (47) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL DEFAULT 'home_top' CHECK (placement IN ('home_top','home_middle','marketplace_top')),
  title text NOT NULL,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text CHECK (cta_href IS NULL OR cta_href ~ '^(/|https://)'),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live banners are public" ON public.site_banners FOR SELECT USING (
  (is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "Admins manage banners" ON public.site_banners FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Content is public" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.site_content (key, value) VALUES
  ('home_hero', jsonb_build_object('eyebrow', 'Le grand marché d''Afrique de l''Ouest, dans votre poche', 'title_1', 'Tout s''achète.', 'title_2', 'Tout se vend.',
    'subtitle', 'Produits, services, talents et livraison au même endroit. Vous payez en mobile money, l''argent reste bloqué jusqu''à ce que vous ayez reçu votre commande.',
    'quick_searches', jsonb_build_array('Téléphone','Pagne wax','Igname','Plombier','Graphiste'))),
  ('announcement', jsonb_build_object('enabled', false, 'text', '', 'href', ''))
ON CONFLICT DO NOTHING;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['site_banners','site_content'] LOOP
    EXECUTE format('CREATE TRIGGER audit_admin AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change()', t);
  END LOOP;
END $$;

-- ───────────────────────── Legal documents and data export (48) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'ALL',
  doc_type text NOT NULL CHECK (doc_type IN ('terms','sales','privacy','cookies')),
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,          -- markdown
  published_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (country, doc_type, version)
);
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal docs are public" ON public.legal_documents FOR SELECT USING (is_active OR public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "Admins manage legal docs" ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE TRIGGER audit_admin AFTER INSERT OR UPDATE OR DELETE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

-- Everything MIYASHI holds about the caller, as one JSON document.
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); v jsonb := '{}'; t record; r jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  v := jsonb_build_object('exported_at', now(), 'account', (SELECT jsonb_build_object('id', id, 'email', email, 'phone', phone, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at) FROM auth.users WHERE id = u));
  FOR t IN SELECT * FROM (VALUES
    ('profiles','user_id'), ('user_roles','user_id'), ('user_preferences','user_id'), ('addresses','user_id'), ('wallets','user_id'),
    ('wallet_transactions','user_id'), ('fedapay_transactions','user_id'), ('orders','buyer_id'), ('orders','seller_id'),
    ('products','seller_id'), ('services','provider_id'), ('favorites','user_id'), ('reviews','reviewer_id'), ('messages','sender_id'),
    ('notifications','user_id'), ('cart_items','user_id'), ('price_offers','buyer_id'), ('savings_goals','user_id'),
    ('group_buy_participants','user_id'), ('bookings','client_id'), ('quotes','client_id'), ('quotes','provider_id'), ('portfolio_items','user_id'),
    ('stock_alerts','user_id'), ('shops','owner_id'), ('kyc_documents','user_id'), ('disputes','opened_by'), ('support_tickets','user_id'),
    ('loyalty_transactions','user_id'), ('referral_codes','user_id'), ('freelance_profiles','user_id'), ('driver_profiles','user_id')) AS x(tbl, col)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = t.col) THEN
      EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]'') FROM public.%I x WHERE %I = $1', t.tbl, t.col) INTO r USING u;
      v := v || jsonb_build_object(t.tbl || CASE WHEN t.tbl IN ('orders','quotes') THEN '_as_' || t.col ELSE '' END, r);
    END IF;
  END LOOP;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ───────────────────────── Health, status page, backups (49) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.status_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  component text NOT NULL,
  ok boolean NOT NULL,
  latency_ms int,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.status_checks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS status_checks_idx ON public.status_checks(component, checked_at DESC);

CREATE OR REPLACE FUNCTION public.get_status_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('component', c.component,
    'ok', (SELECT ok FROM status_checks s WHERE s.component = c.component ORDER BY checked_at DESC LIMIT 1),
    'last_checked', (SELECT max(checked_at) FROM status_checks s WHERE s.component = c.component),
    'uptime_24h', (SELECT round(100.0 * count(*) FILTER (WHERE ok) / NULLIF(count(*),0), 2) FROM status_checks s WHERE s.component = c.component AND checked_at > now() - interval '24 hours'),
    'uptime_7d', (SELECT round(100.0 * count(*) FILTER (WHERE ok) / NULLIF(count(*),0), 2) FROM status_checks s WHERE s.component = c.component AND checked_at > now() - interval '7 days'),
    'latency_ms', (SELECT latency_ms FROM status_checks s WHERE s.component = c.component ORDER BY checked_at DESC LIMIT 1)) ORDER BY c.component), '[]')
  FROM (SELECT DISTINCT component FROM status_checks WHERE checked_at > now() - interval '7 days') c
$$;
GRANT EXECUTE ON FUNCTION public.get_status_summary() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  path text,
  size_bytes bigint,
  row_counts jsonb,
  verified boolean NOT NULL DEFAULT false,
  error text
);
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see backups" ON public.backup_runs FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Admins download backups" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'backups' AND public.has_role((select auth.uid()), 'admin'));

-- Voice messages live in chat-attachments; nothing to add to the schema.

SELECT cron.schedule('miyashi-health', '*/10 * * * *', $$SELECT public.call_internal_function('health')$$);
SELECT cron.schedule('miyashi-risk', '29 2 * * *', $$SELECT public.refresh_risk_scores()$$);
SELECT cron.schedule('miyashi-backup', '13 1 * * 0', $$SELECT public.call_internal_function('backup-export')$$);
SELECT cron.schedule('miyashi-status-cleanup', '51 4 * * *', $$DELETE FROM public.status_checks WHERE checked_at < now() - interval '30 days'$$);
