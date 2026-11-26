-- Hardening and platform improvements
--  * security audit fixes (functions callable through the API that should not be)
--  * rate limiting
--  * double-entry ledger, immutable money history, daily reconciliation
--  * client error log (self-hosted error monitoring)
--  * accent- and typo-tolerant product search
--  * pickup point partner applications (programme "Devenir point relais")
--  * USSD callback key kept in Vault

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ───────────────────────── 1. Security audit fixes ─────────────────────────
-- Trigger and internal functions must not be callable through /rest/v1/rpc.
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['after_listing_saved()','audit_admin_change()','dispatch_notification()','flag_risky_order()','moderate_listing()',
    'notify_back_in_stock()','refund_cancelled_order()','award_points_on_order_complete()','update_driver_stats()','notify_on_delivery_request()',
    'soft_delete_product()','handle_new_user()','award_loyalty_points(uuid,integer,text,text,uuid)'] LOOP
    IF to_regprocedure('public.' || f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    END IF;
  END LOOP;
END $$;

ALTER FUNCTION public.format_address(public.addresses) SET search_path = public;

-- Users could send any "order"/"promotion" notification with free text to anyone (and it is now e-mailed).
-- Only social types stay open to users, rate-limited and never e-mailed.
CREATE OR REPLACE FUNCTION public.send_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_admin_types text[] := ARRAY['kyc_approved','kyc_rejected','kyc_verified','admin_alert','system','order','delivery','delivery_request','promotion','boost'];
  v_user_types text[] := ARRAY['follow','message','review'];
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id is required'; END IF;
  IF length(p_title) > 200 OR length(p_message) > 1000 THEN RAISE EXCEPTION 'Texte trop long'; END IF;
  IF p_type = ANY(v_admin_types) THEN
    IF NOT public.has_role(v_caller, 'admin') THEN RAISE EXCEPTION 'Unauthorized notification type'; END IF;
  ELSIF p_type = ANY(v_user_types) THEN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF v_caller = p_user_id THEN RAISE EXCEPTION 'Cannot notify yourself'; END IF;
    IF NOT public.hit_rate_limit('notify:' || v_caller, 30, 3600) THEN RAISE EXCEPTION 'Trop de notifications envoyées, réessayez plus tard'; END IF;
    p_data := COALESCE(p_data, '{}'::jsonb) || jsonb_build_object('user_sent', true, 'from', v_caller);
  ELSE
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, data) VALUES (p_user_id, p_type, p_title, p_message, p_data);
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((NEW.data->>'user_sent')::boolean, false) THEN RETURN NULL; END IF;
  IF NEW.type IN ('order','wallet','offer','quote','booking','group_buy','stock','dispute','payout','shop_invite','security','partner') THEN
    PERFORM public.call_internal_function('notify-dispatch', jsonb_build_object('notification_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.dispatch_notification() FROM PUBLIC, anon, authenticated;

-- ───────────────────────── 2. Rate limiting ─────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;   -- server only

-- True if the call is allowed; counts it. Fixed windows of p_window seconds.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_max int, p_window int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window) * p_window); v_hits int;
BEGIN
  INSERT INTO rate_limits (key, window_start, hits) VALUES (left(p_key, 200), v_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
  RETURNING hits INTO v_hits;
  RETURN v_hits <= p_max;
END $$;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, int, int) TO service_role;
SELECT cron.schedule('miyashi-rate-limit-cleanup', '*/30 * * * *', $$DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day'$$);

-- Wrap money-moving entry points with per-user limits (the original logic is unchanged).
CREATE OR REPLACE FUNCTION public.place_order(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offer price_offers; v_p jsonb := p - 'unit_price_override' - 'source' - 'source_id';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.hit_rate_limit('order:' || auth.uid(), 30, 3600) THEN RAISE EXCEPTION 'Trop de commandes en peu de temps, réessayez dans une heure'; END IF;
  IF COALESCE(p->>'payment_mode','wallet') = 'prefunded' THEN RAISE EXCEPTION 'Invalid payment mode'; END IF;
  IF COALESCE(p->>'payment_mode','wallet') = 'cod'
     AND (SELECT count(*) FROM orders WHERE buyer_id = auth.uid() AND payment_mode = 'cod' AND status NOT IN ('completed','cancelled')) >= 5 THEN
    RAISE EXCEPTION 'Vous avez déjà 5 commandes à payer à la livraison en cours';
  END IF;
  IF NULLIF(p->>'offer_id','') IS NOT NULL THEN
    SELECT * INTO v_offer FROM price_offers WHERE id = (p->>'offer_id')::uuid AND buyer_id = auth.uid() FOR UPDATE;
    IF NOT FOUND OR v_offer.status <> 'accepted' OR v_offer.expires_at < now() THEN RAISE EXCEPTION 'Offre non valable'; END IF;
    v_p := v_p || jsonb_build_object('product_id', v_offer.product_id, 'variant_id', v_offer.variant_id, 'quantity', v_offer.quantity,
      'unit_price_override', v_offer.agreed_price, 'source', 'offer', 'source_id', v_offer.id, 'promo_code', NULL);
    UPDATE price_offers SET status = 'used', updated_at = now() WHERE id = v_offer.id;
  END IF;
  RETURN public._place_order(auth.uid(), v_p);
END $$;

CREATE OR REPLACE FUNCTION public.rate_guard(p_action text, p_max int, p_window int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.hit_rate_limit(p_action || ':' || COALESCE(auth.uid()::text, 'anon'), p_max, p_window) THEN
    RAISE EXCEPTION 'Trop de tentatives, réessayez plus tard';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.rate_guard(text, int, int) FROM PUBLIC, anon, authenticated;

-- Row-level guards via triggers keep the existing functions intact.
CREATE OR REPLACE FUNCTION public.rate_guard_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') AND auth.uid() IS NULL THEN RETURN NEW; END IF;
  PERFORM public.rate_guard(TG_TABLE_NAME, TG_ARGV[0]::int, TG_ARGV[1]::int);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rate_guard_trigger() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS rate_guard ON public.pending_checkouts;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.pending_checkouts FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('20', '3600');
DROP TRIGGER IF EXISTS rate_guard ON public.quotes;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('40', '86400');
DROP TRIGGER IF EXISTS rate_guard ON public.messages;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('120', '600');
DROP TRIGGER IF EXISTS rate_guard ON public.products;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('600', '86400');
DROP TRIGGER IF EXISTS rate_guard ON public.reports;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('20', '86400');
DROP TRIGGER IF EXISTS rate_guard ON public.shop_members;
CREATE TRIGGER rate_guard BEFORE INSERT ON public.shop_members FOR EACH ROW EXECUTE FUNCTION public.rate_guard_trigger('30', '86400');

-- ───────────────────────── 3. Double-entry ledger + immutable history ─────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  txn_id uuid NOT NULL,                 -- wallet_transactions.id
  account text NOT NULL,                -- wallet:<uuid> | escrow | platform_revenue | external:fedapay | payout_pending | hold:savings | hold:group_buy
  debit numeric NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((debit = 0) <> (credit = 0))
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON public.ledger_entries(account, created_at);
CREATE INDEX IF NOT EXISTS ledger_entries_txn_idx ON public.ledger_entries(txn_id);
CREATE POLICY "Admins read ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.ledger_counterparty(p_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'deposit' THEN 'external:fedapay'
    WHEN 'purchase' THEN 'escrow'
    WHEN 'escrow_release' THEN 'escrow'
    WHEN 'refund' THEN 'escrow'
    WHEN 'savings' THEN 'hold:savings'
    WHEN 'group_buy' THEN 'hold:group_buy'
    WHEN 'commission' THEN 'platform_revenue'
    WHEN 'withdrawal' THEN 'payout_pending'
    WHEN 'boost' THEN 'platform_revenue'
    ELSE 'adjustment' END
$$;

CREATE OR REPLACE FUNCTION public.post_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amt numeric := abs(NEW.amount); v_wallet text := 'wallet:' || NEW.user_id; v_other text := public.ledger_counterparty(NEW.type);
BEGIN
  IF v_amt = 0 OR NEW.status = 'failed' THEN RETURN NULL; END IF;
  IF NEW.amount > 0 THEN      -- money comes into the wallet
    INSERT INTO ledger_entries (txn_id, account, debit) VALUES (NEW.id, v_other, v_amt);
    INSERT INTO ledger_entries (txn_id, account, credit) VALUES (NEW.id, v_wallet, v_amt);
  ELSE                        -- money leaves the wallet
    INSERT INTO ledger_entries (txn_id, account, debit) VALUES (NEW.id, v_wallet, v_amt);
    INSERT INTO ledger_entries (txn_id, account, credit) VALUES (NEW.id, v_other, v_amt);
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.post_ledger() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS post_ledger ON public.wallet_transactions;
CREATE TRIGGER post_ledger AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.post_ledger();

-- Backfill the ledger for existing transactions.
INSERT INTO public.ledger_entries (txn_id, account, debit, credit, created_at)
SELECT t.id, x.account, x.debit, x.credit, t.created_at
FROM public.wallet_transactions t
CROSS JOIN LATERAL (VALUES
  (CASE WHEN t.amount > 0 THEN public.ledger_counterparty(t.type) ELSE 'wallet:' || t.user_id END, abs(t.amount), 0::numeric),
  (CASE WHEN t.amount > 0 THEN 'wallet:' || t.user_id ELSE public.ledger_counterparty(t.type) END, 0::numeric, abs(t.amount))) x(account, debit, credit)
WHERE t.amount <> 0 AND COALESCE(t.status, 'completed') <> 'failed'
  AND NOT EXISTS (SELECT 1 FROM public.ledger_entries l WHERE l.txn_id = t.id);

-- Amounts in the money history can never be edited or deleted (status changes stay possible).
CREATE OR REPLACE FUNCTION public.protect_money_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Cascades from an account deletion run inside the foreign-key trigger (depth > 1).
    IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'L''historique financier ne peut pas être supprimé';
  END IF;
  IF TG_TABLE_NAME = 'wallet_transactions' THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.type IS DISTINCT FROM OLD.type THEN
      RAISE EXCEPTION 'Le montant d''une transaction ne peut pas être modifié';
    END IF;
  ELSIF TG_TABLE_NAME = 'escrow_transactions' THEN
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount OR NEW.payer_id IS DISTINCT FROM OLD.payer_id OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
      RAISE EXCEPTION 'Le séquestre ne peut pas être modifié';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'ledger_entries' THEN RAISE EXCEPTION 'Le grand livre est en écriture seule'; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['wallet_transactions','escrow_transactions','ledger_entries'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS protect_money_history ON public.%I', t);
    EXECUTE format('CREATE TRIGGER protect_money_history BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.protect_money_history()', t);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.reconciliation_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  issues jsonb NOT NULL,
  totals jsonb NOT NULL
);
ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reconciliation" ON public.reconciliation_reports FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

-- Daily: wallet balances vs their history, FedaPay credits vs deposits, ledger balance, paid orders vs escrow.
CREATE OR REPLACE FUNCTION public.run_reconciliation()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_issues jsonb := '[]'; v_totals jsonb; r record; v_ok boolean;
BEGIN
  FOR r IN SELECT w.user_id, w.balance, COALESCE(sum(t.amount) FILTER (WHERE COALESCE(t.status,'completed') <> 'failed'), 0) hist
    FROM wallets w LEFT JOIN wallet_transactions t ON t.user_id = w.user_id GROUP BY w.user_id, w.balance
    HAVING w.balance <> COALESCE(sum(t.amount) FILTER (WHERE COALESCE(t.status,'completed') <> 'failed'), 0) LOOP
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'wallet_mismatch', 'user_id', r.user_id, 'balance', r.balance, 'history', r.hist));
  END LOOP;
  FOR r IN SELECT f.id, f.fedapay_id, f.amount FROM fedapay_transactions f
    WHERE f.credited_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wallet_transactions t WHERE t.reference_id = f.id AND t.type = 'deposit') LOOP
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'fedapay_credit_without_deposit', 'fedapay_id', r.fedapay_id, 'amount', r.amount));
  END LOOP;
  FOR r IN SELECT f.id, f.fedapay_id FROM fedapay_transactions f WHERE f.status = 'approved' AND f.credited_at IS NULL AND f.updated_at < now() - interval '1 hour' LOOP
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'fedapay_approved_not_credited', 'fedapay_id', r.fedapay_id));
  END LOOP;
  FOR r IN SELECT o.id FROM orders o WHERE o.payment_status = 'paid' AND o.payment_mode IN ('wallet','prefunded') AND o.total_price > 0
    AND NOT EXISTS (SELECT 1 FROM escrow_transactions e WHERE e.order_id = o.id) AND o.created_at > '2026-11-27' LOOP
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'paid_order_without_escrow', 'order_id', r.id));
  END LOOP;
  IF (SELECT COALESCE(sum(debit),0) <> COALESCE(sum(credit),0) FROM ledger_entries) THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'ledger_unbalanced'));
  END IF;
  v_totals := jsonb_build_object(
    'wallets', (SELECT COALESCE(sum(balance),0) FROM wallets),
    'escrow_held', (SELECT COALESCE(sum(total_amount),0) FROM escrow_transactions WHERE status = 'held'),
    'fedapay_credited', (SELECT COALESCE(sum(amount),0) FROM fedapay_transactions WHERE credited_at IS NOT NULL),
    'payouts_pending', (SELECT COALESCE(-sum(amount),0) FROM wallet_transactions WHERE type = 'withdrawal' AND status = 'pending'));
  v_ok := jsonb_array_length(v_issues) = 0;
  INSERT INTO reconciliation_reports (ok, issues, totals) VALUES (v_ok, v_issues, v_totals);
  IF NOT v_ok THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT user_id, 'security', 'Rapprochement comptable : anomalies', jsonb_array_length(v_issues) || ' anomalie(s) détectée(s). Voir Admin → Exploitation.', '{}'::jsonb
    FROM user_roles WHERE role = 'admin';
  END IF;
  RETURN jsonb_build_object('ok', v_ok, 'issues', v_issues, 'totals', v_totals);
END $$;
REVOKE EXECUTE ON FUNCTION public.run_reconciliation() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('miyashi-reconciliation', '47 2 * * *', $$SELECT public.run_reconciliation()$$);

-- ───────────────────────── 4. Client error log ─────────────────────────
CREATE TABLE IF NOT EXISTS public.client_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  session_id text,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  release text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS client_errors_created_idx ON public.client_errors(created_at DESC);
CREATE POLICY "Admins read client errors" ON public.client_errors FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.log_client_error(p_message text, p_stack text DEFAULT NULL, p_url text DEFAULT NULL, p_user_agent text DEFAULT NULL, p_session text DEFAULT NULL, p_release text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.hit_rate_limit('clienterr:' || COALESCE(auth.uid()::text, left(p_session, 64), 'anon'), 20, 3600) THEN RETURN; END IF;
  INSERT INTO client_errors (user_id, session_id, message, stack, url, user_agent, release)
  VALUES (auth.uid(), left(p_session, 64), left(p_message, 1000), left(p_stack, 4000), left(p_url, 500), left(p_user_agent, 300), left(p_release, 40));
END $$;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text, text) TO anon, authenticated;
SELECT cron.schedule('miyashi-client-errors-cleanup', '13 5 * * *', $$DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days'$$);

-- ───────────────────────── 5. Accent- and typo-tolerant search ─────────────────────────
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SET search_path = public, extensions AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;
CREATE INDEX IF NOT EXISTS products_title_unaccent_trgm_idx ON public.products USING gin (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

DROP FUNCTION IF EXISTS public.search_products(text, uuid, numeric, numeric, text, text, integer, integer);
CREATE FUNCTION public.search_products(p_query text DEFAULT NULL, p_category_id uuid DEFAULT NULL, p_min_price numeric DEFAULT 0, p_max_price numeric DEFAULT 99999999,
  p_location text DEFAULT NULL, p_sort_by text DEFAULT 'newest', p_page integer DEFAULT 1, p_per_page integer DEFAULT 24)
RETURNS TABLE(id uuid, title text, description text, price numeric, images text[], location text, seller_id uuid, category_id uuid, stock integer, is_active boolean, created_at timestamptz, rank real)
LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE q text := NULLIF(trim(p_query), ''); nq text := public.f_unaccent(lower(COALESCE(NULLIF(trim(p_query), ''), '')));
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.description, p.price, p.images, p.location, p.seller_id, p.category_id, p.stock, p.is_active, p.created_at,
    (CASE WHEN q IS NULL THEN 0 ELSE
      ts_rank(to_tsvector('french', public.f_unaccent(coalesce(p.title,'') || ' ' || coalesce(p.description,''))), plainto_tsquery('french', public.f_unaccent(q)))
      + extensions.word_similarity(nq, public.f_unaccent(lower(p.title))) END)::real AS rank
  FROM products p
  WHERE p.is_active AND p.deleted_at IS NULL AND p.price BETWEEN p_min_price AND p_max_price
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_location IS NULL OR p_location = '' OR public.f_unaccent(lower(p.location)) LIKE '%' || public.f_unaccent(lower(p_location)) || '%')
    AND (q IS NULL
      OR to_tsvector('french', public.f_unaccent(coalesce(p.title,'') || ' ' || coalesce(p.description,''))) @@ plainto_tsquery('french', public.f_unaccent(q))
      OR public.f_unaccent(lower(p.title)) LIKE '%' || nq || '%'
      OR extensions.word_similarity(nq, public.f_unaccent(lower(p.title))) > 0.4)
  ORDER BY
    CASE WHEN p_sort_by = 'relevance' THEN -(ts_rank(to_tsvector('french', public.f_unaccent(coalesce(p.title,''))), plainto_tsquery('french', public.f_unaccent(COALESCE(q,'')))) + extensions.word_similarity(nq, public.f_unaccent(lower(p.title)))) END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'oldest' THEN p.created_at END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-asc' THEN p.price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-desc' THEN p.price END DESC NULLS LAST,
    p.created_at DESC
  LIMIT LEAST(GREATEST(p_per_page, 1), 100) OFFSET (GREATEST(p_page, 1) - 1) * LEAST(GREATEST(p_per_page, 1), 100);
END $$;
GRANT EXECUTE ON FUNCTION public.search_products(text, uuid, numeric, numeric, text, text, integer, integer) TO anon, authenticated;

-- ───────────────────────── 6. Pickup point partner programme ─────────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','info_requested','visit_scheduled','approved','rejected','withdrawn')),
  -- company
  company_name text, legal_form text, business_type text, rccm_number text, nif_number text, year_founded int,
  -- legal representative
  manager_name text, manager_role text, manager_id_type text, manager_id_number text,
  phone text, whatsapp text, email text,
  -- premises
  country text DEFAULT 'TG', city text, district text, address text, landmark text, lat double precision, lng double precision,
  premises_status text CHECK (premises_status IS NULL OR premises_status IN ('owner','tenant','other')),
  storage_area_m2 numeric, max_parcels int, staff_count int,
  has_secure_storage boolean DEFAULT false, has_cctv boolean DEFAULT false, has_fire_extinguisher boolean DEFAULT false,
  has_insurance boolean DEFAULT false, insurer_name text, has_smartphone boolean DEFAULT false, has_internet boolean DEFAULT false,
  ground_floor_access boolean DEFAULT false, parking_nearby boolean DEFAULT false,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- payouts
  payout_method text CHECK (payout_method IS NULL OR payout_method IN ('mobile_money','bank')), payout_account text,
  -- uploads (paths in the private bucket partner-documents) and commitments
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  commitments jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivation text,
  -- review
  check_documents boolean NOT NULL DEFAULT false, check_identity boolean NOT NULL DEFAULT false, check_phone boolean NOT NULL DEFAULT false,
  check_references boolean NOT NULL DEFAULT false, check_site_visit boolean NOT NULL DEFAULT false, check_training boolean NOT NULL DEFAULT false,
  check_contract boolean NOT NULL DEFAULT false,
  site_visit_at timestamptz, site_visit_notes text, admin_notes text, info_request text, decision_reason text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_point_id uuid REFERENCES public.pickup_points(id) ON DELETE SET NULL,
  submitted_at timestamptz, decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pickup_partner_applications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS pickup_partner_applications_open_idx ON public.pickup_partner_applications(user_id) WHERE status NOT IN ('rejected','withdrawn','approved');
CREATE TRIGGER pickup_partner_applications_updated_at BEFORE UPDATE ON public.pickup_partner_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_admin AFTER INSERT OR UPDATE OR DELETE ON public.pickup_partner_applications FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

CREATE POLICY "Applicant reads own application" ON public.pickup_partner_applications FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "Applicant creates draft" ON public.pickup_partner_applications FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND status = 'draft');
CREATE POLICY "Applicant edits while draft or info requested" ON public.pickup_partner_applications FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND status IN ('draft','info_requested'))
  WITH CHECK ((select auth.uid()) = user_id AND status IN ('draft','info_requested'));
CREATE POLICY "Admins manage applications" ON public.pickup_partner_applications FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- Applicants cannot tick their own review boxes.
CREATE OR REPLACE FUNCTION public.guard_partner_application()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.check_documents IS DISTINCT FROM OLD.check_documents OR NEW.check_identity IS DISTINCT FROM OLD.check_identity
       OR NEW.check_phone IS DISTINCT FROM OLD.check_phone OR NEW.check_references IS DISTINCT FROM OLD.check_references
       OR NEW.check_site_visit IS DISTINCT FROM OLD.check_site_visit OR NEW.check_training IS DISTINCT FROM OLD.check_training
       OR NEW.check_contract IS DISTINCT FROM OLD.check_contract OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id OR NEW.pickup_point_id IS DISTINCT FROM OLD.pickup_point_id
       OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Champ réservé à l''équipe MIYASHI';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_partner_application ON public.pickup_partner_applications;
CREATE TRIGGER guard_partner_application BEFORE UPDATE ON public.pickup_partner_applications FOR EACH ROW EXECUTE FUNCTION public.guard_partner_application();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner-documents', 'partner-documents', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Applicants upload own partner documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "Applicants and admins read partner documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-documents' AND ((storage.foldername(name))[1] = (select auth.uid())::text OR public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Applicants replace own partner documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Submitting checks that everything required is there.
CREATE OR REPLACE FUNCTION public.submit_partner_application(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a pickup_partner_applications; v_missing text[] := '{}'; d text; c text;
BEGIN
  SELECT * INTO a FROM pickup_partner_applications WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR a.status NOT IN ('draft','info_requested') THEN RAISE EXCEPTION 'Dossier introuvable ou déjà envoyé'; END IF;
  IF COALESCE(a.company_name,'') = '' THEN v_missing := array_append(v_missing, ('nom de l''entreprise')::text); END IF;
  IF COALESCE(a.rccm_number,'') = '' THEN v_missing := array_append(v_missing, ('numéro RCCM')::text); END IF;
  IF COALESCE(a.nif_number,'') = '' THEN v_missing := array_append(v_missing, ('numéro fiscal (NIF)')::text); END IF;
  IF COALESCE(a.manager_name,'') = '' OR COALESCE(a.manager_id_number,'') = '' THEN v_missing := array_append(v_missing, ('responsable et sa pièce d''identité')::text); END IF;
  IF length(regexp_replace(COALESCE(a.phone,''), '\D', '', 'g')) < 8 THEN v_missing := array_append(v_missing, ('téléphone')::text); END IF;
  IF COALESCE(a.city,'') = '' OR COALESCE(a.address,'') = '' THEN v_missing := array_append(v_missing, ('adresse du local')::text); END IF;
  IF a.lat IS NULL THEN v_missing := array_append(v_missing, ('position GPS du local')::text); END IF;
  IF COALESCE(a.storage_area_m2, 0) < 4 THEN v_missing := array_append(v_missing, ('surface de stockage (4 m² minimum)')::text); END IF;
  IF NOT a.has_secure_storage THEN v_missing := array_append(v_missing, ('espace de stockage fermant à clé')::text); END IF;
  IF NOT a.has_smartphone THEN v_missing := array_append(v_missing, ('smartphone avec internet')::text); END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(a.opening_hours)) < 5 THEN v_missing := array_append(v_missing, ('ouverture au moins 5 jours par semaine')::text); END IF;
  IF a.payout_method IS NULL OR COALESCE(a.payout_account,'') = '' THEN v_missing := array_append(v_missing, ('compte de paiement')::text); END IF;
  FOREACH d IN ARRAY ARRAY['rccm','nif','id_front','id_back','proof_address','storefront_photo','storage_photo','premises_title'] LOOP
    IF COALESCE(a.documents->>d, '') = '' THEN v_missing := array_append(v_missing, (('pièce : ' || d))::text); END IF;
  END LOOP;
  FOREACH c IN ARRAY ARRAY['charter','storage_rules','prohibited_goods','data_protection','verification_consent','truthful'] LOOP
    IF COALESCE((a.commitments->>c)::boolean, false) IS NOT TRUE THEN v_missing := array_append(v_missing, (('engagement : ' || c))::text); END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN RETURN jsonb_build_object('success', false, 'missing', to_jsonb(v_missing)); END IF;
  UPDATE pickup_partner_applications SET status = 'submitted', submitted_at = now(), info_request = NULL WHERE id = a.id;
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT user_id, 'partner', 'Nouvelle candidature point relais', COALESCE(a.company_name, '') || ' (' || COALESCE(a.city, '') || ')', jsonb_build_object('application_id', a.id)
  FROM user_roles WHERE role = 'admin';
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (a.user_id, 'partner', 'Dossier reçu',
    'Votre candidature point relais est reçue. Nous vérifions vos pièces sous 5 jours ouvrés.', jsonb_build_object('application_id', a.id));
  RETURN jsonb_build_object('success', true);
END $$;

-- Admin decisions.
CREATE OR REPLACE FUNCTION public.review_partner_application(p_id uuid, p_action text, p_message text DEFAULT NULL, p_visit_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a pickup_partner_applications; v_point uuid; v_title text; v_msg text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  SELECT * INTO a FROM pickup_partner_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dossier introuvable'; END IF;
  IF p_action = 'start_review' THEN
    UPDATE pickup_partner_applications SET status = 'under_review', reviewer_id = auth.uid() WHERE id = a.id;
    v_title := 'Dossier en cours d''examen'; v_msg := 'Un conseiller MIYASHI examine votre candidature.';
  ELSIF p_action = 'request_info' THEN
    IF COALESCE(p_message, '') = '' THEN RAISE EXCEPTION 'Précisez les informations demandées'; END IF;
    UPDATE pickup_partner_applications SET status = 'info_requested', info_request = p_message, reviewer_id = auth.uid() WHERE id = a.id;
    v_title := 'Compléments demandés'; v_msg := p_message;
  ELSIF p_action = 'schedule_visit' THEN
    IF p_visit_at IS NULL THEN RAISE EXCEPTION 'Indiquez la date de visite'; END IF;
    UPDATE pickup_partner_applications SET status = 'visit_scheduled', site_visit_at = p_visit_at, reviewer_id = auth.uid() WHERE id = a.id;
    v_title := 'Visite de votre local programmée'; v_msg := 'Visite prévue le ' || to_char(p_visit_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM/YYYY à HH24:MI') || '. Préparez les originaux de vos pièces.';
  ELSIF p_action = 'approve' THEN
    IF NOT (a.check_documents AND a.check_identity AND a.check_phone AND a.check_site_visit AND a.check_training AND a.check_contract) THEN
      RAISE EXCEPTION 'Toutes les vérifications doivent être cochées (pièces, identité, téléphone, visite, formation, contrat)';
    END IF;
    INSERT INTO pickup_points (name, address, city, country, lat, lng, opening_hours, phone, partner_id, is_active)
    VALUES (a.company_name, concat_ws(', ', a.address, a.district, CASE WHEN a.landmark IS NOT NULL THEN 'Repère : ' || a.landmark END), a.city, COALESCE(a.country, 'TG'),
      a.lat, a.lng, (SELECT string_agg(k || ' ' || (v->0->>0) || '-' || (v->0->>1), ', ') FROM jsonb_each(a.opening_hours) x(k, v)), a.phone, a.user_id, true)
    RETURNING id INTO v_point;
    UPDATE pickup_partner_applications SET status = 'approved', pickup_point_id = v_point, decided_at = now(), decision_reason = p_message, reviewer_id = auth.uid() WHERE id = a.id;
    v_title := 'Bienvenue dans le réseau de points relais MIYASHI 🎉'; v_msg := 'Votre point relais est actif. Gérez vos colis depuis la page « Point relais ».';
  ELSIF p_action = 'reject' THEN
    IF COALESCE(p_message, '') = '' THEN RAISE EXCEPTION 'Indiquez la raison du refus'; END IF;
    UPDATE pickup_partner_applications SET status = 'rejected', decided_at = now(), decision_reason = p_message, reviewer_id = auth.uid() WHERE id = a.id;
    v_title := 'Candidature non retenue'; v_msg := p_message;
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (a.user_id, 'partner', v_title, v_msg, jsonb_build_object('application_id', a.id));
  RETURN jsonb_build_object('success', true, 'pickup_point_id', v_point);
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_partner_application(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE pickup_partner_applications SET status = 'withdrawn' WHERE id = p_id AND user_id = auth.uid() AND status NOT IN ('approved','rejected','withdrawn');
$$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['submit_partner_application(uuid)','review_partner_application(uuid,text,text,timestamptz)','withdraw_partner_application(uuid)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- Programme terms shown on the page; editable in Admin → Livraison.
INSERT INTO public.site_content (key, value) VALUES ('pickup_program', jsonb_build_object(
  'fee_per_parcel', 200, 'fee_per_cod_parcel', 300, 'fee_per_return', 100, 'payout_frequency', 'chaque semaine', 'max_storage_days', 7,
  'review_days', 5, 'min_storage_m2', 4, 'min_days_open', 5))
ON CONFLICT (key) DO NOTHING;

-- ───────────────────────── 7. USSD callback key in Vault ─────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'ussd_callback_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'ussd_callback_key', 'Key in the USSD/SMS callback URL');
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.verify_ussd_key(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'ussd_callback_key' AND decrypted_secret = p_key)
$$;
REVOKE EXECUTE ON FUNCTION public.verify_ussd_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ussd_key(text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_integration_urls()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE k text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'ussd_callback_key';
  RETURN jsonb_build_object(
    'ussd', 'https://decycxufopbagjdpejul.supabase.co/functions/v1/ussd?key=' || k,
    'sms', 'https://decycxufopbagjdpejul.supabase.co/functions/v1/ussd?key=' || k || '&mode=sms',
    'fedapay_webhook', 'https://decycxufopbagjdpejul.supabase.co/functions/v1/fedapay-webhook');
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_integration_urls() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_integration_urls() TO authenticated;
