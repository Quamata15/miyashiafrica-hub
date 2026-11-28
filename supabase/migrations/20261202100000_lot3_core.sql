-- Lot 3: newsletter, guest clean-up, end of service, disputes with partial refunds,
-- delivery quote and live tracking, external notifications, savings reminders, verified reviews.

-------------------------------------------------------------------------------
-- 1. Newsletter: double opt-in (confirmation e-mail), one-click unsubscribe.
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  user_id uuid,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_email_ok CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' AND char_length(email) <= 254)
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_key ON public.newsletter_subscribers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_token_key ON public.newsletter_subscribers (token);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin reads subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email text, p_source text DEFAULT 'footer')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(btrim(p_email)); s newsletter_subscribers; v_key text;
BEGIN
  v_key := 'newsletter:' || COALESCE(auth.uid()::text, current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', 'anon');
  IF NOT public.hit_rate_limit(v_key, 5, 3600) THEN RAISE EXCEPTION 'Trop de tentatives, réessayez plus tard'; END IF;
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' THEN RAISE EXCEPTION 'Adresse e-mail invalide'; END IF;
  SELECT * INTO s FROM newsletter_subscribers WHERE lower(email) = v_email;
  IF FOUND AND s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL THEN RETURN jsonb_build_object('status', 'already'); END IF;
  IF FOUND THEN
    UPDATE newsletter_subscribers SET unsubscribed_at = NULL, confirmed_at = NULL, token = encode(extensions.gen_random_bytes(18), 'hex'),
      user_id = COALESCE(user_id, auth.uid()) WHERE id = s.id RETURNING * INTO s;
  ELSE
    INSERT INTO newsletter_subscribers (email, user_id, source) VALUES (v_email, auth.uid(), left(p_source, 40)) RETURNING * INTO s;
  END IF;
  PERFORM public.call_internal_function('newsletter', jsonb_build_object('subscriber_id', s.id, 'action', 'confirm'));
  RETURN jsonb_build_object('status', 'pending');
END $$;

CREATE OR REPLACE FUNCTION public.confirm_newsletter(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s newsletter_subscribers;
BEGIN
  UPDATE newsletter_subscribers SET confirmed_at = COALESCE(confirmed_at, now()), unsubscribed_at = NULL
  WHERE token = p_token RETURNING * INTO s;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'unknown'); END IF;
  RETURN jsonb_build_object('status', 'confirmed', 'email', regexp_replace(s.email, '^(.).*(@.*)$', '\1•••\2'));
END $$;

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s newsletter_subscribers;
BEGIN
  UPDATE newsletter_subscribers SET unsubscribed_at = now() WHERE token = p_token RETURNING * INTO s;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'unknown'); END IF;
  RETURN jsonb_build_object('status', 'unsubscribed');
END $$;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_newsletter(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(text) TO anon, authenticated;

-------------------------------------------------------------------------------
-- 2. Guest accounts: removed after 30 days without any order, savings, money or message.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_guests()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE n int;
BEGIN
  WITH gone AS (
    DELETE FROM auth.users u
    WHERE u.is_anonymous
      AND u.created_at < now() - interval '30 days'
      AND COALESCE(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.buyer_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.savings_goals g WHERE g.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id AND w.balance <> 0)
      AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.sender_id = u.id)
    RETURNING 1)
  SELECT count(*) INTO n FROM gone;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_guests() FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  PERFORM cron.unschedule('miyashi-guest-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'miyashi-guest-cleanup');
  PERFORM cron.schedule('miyashi-guest-cleanup', '33 3 * * *', 'SELECT public.cleanup_guests()');
END $$;

-------------------------------------------------------------------------------
-- 3. End of a service: the provider marks it done, the client validates (escrow released);
--    without an answer or a dispute, it is released automatically after 7 days.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_service(p_order_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_seller(o.seller_id) OR o.service_id IS NULL THEN RAISE EXCEPTION 'Prestation introuvable'; END IF;
  IF o.payment_status <> 'paid' THEN RAISE EXCEPTION 'La prestation n''est pas encore payée'; END IF;
  IF o.status IN ('shipped','completed','cancelled','refunded') THEN RAISE EXCEPTION 'Prestation déjà clôturée ou terminée'; END IF;
  UPDATE orders SET status = 'shipped', delivery_status = 'delivered', actual_delivery = now(),
    notes = concat_ws(E'\n', notes, CASE WHEN p_note IS NOT NULL THEN 'Fin de prestation : ' || left((public.mask_contacts(p_note)).masked, 500) END)
  WHERE id = o.id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'order', 'Prestation terminée',
    'Le prestataire indique avoir terminé. Validez pour le payer, ou ouvrez un litige sous 7 jours.', jsonb_build_object('order_id', o.id));
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.complete_service(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_service(uuid, text) TO authenticated;

-- Providers mark a paid service as started.
CREATE OR REPLACE FUNCTION public.start_service(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_seller(o.seller_id) OR o.service_id IS NULL THEN RAISE EXCEPTION 'Prestation introuvable'; END IF;
  IF o.payment_status <> 'paid' THEN RAISE EXCEPTION 'Attendez le paiement en séquestre avant de commencer'; END IF;
  IF o.status <> 'pending' THEN RETURN; END IF;
  UPDATE orders SET status = 'processing' WHERE id = o.id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'order', 'Prestation commencée',
    'Le prestataire a commencé votre prestation.', jsonb_build_object('order_id', o.id));
END $$;
REVOKE EXECUTE ON FUNCTION public.start_service(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_service(uuid) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Disputes (products and services): opened against the other party, evidence attached,
--    the admin decides: full refund, partial refund, or payment to the seller.
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own disputes" ON public.disputes;   -- the opener could change status and refund
DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;       -- opened through open_dispute only

CREATE OR REPLACE FUNCTION public.open_dispute(p_order_id uuid, p_reason text, p_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; v_id uuid; v_against uuid;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR auth.uid() NOT IN (o.buyer_id, o.seller_id) THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.status IN ('cancelled','refunded') THEN RAISE EXCEPTION 'Commande annulée'; END IF;
  IF o.status = 'completed' AND o.updated_at < now() - interval '14 days' THEN RAISE EXCEPTION 'Délai de réclamation dépassé (14 jours après la clôture)'; END IF;
  IF EXISTS (SELECT 1 FROM disputes WHERE order_id = o.id AND status NOT IN ('resolved','closed','rejected')) THEN RAISE EXCEPTION 'Un litige est déjà ouvert pour cette commande'; END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Choisissez un motif'; END IF;
  v_against := CASE WHEN auth.uid() = o.buyer_id THEN o.seller_id ELSE o.buyer_id END;
  INSERT INTO disputes (order_id, opened_by, against_user, reason, description, status)
  VALUES (o.id, auth.uid(), v_against, left(p_reason, 120), left((public.mask_contacts(p_description)).masked, 3000), 'open')
  RETURNING id INTO v_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_against, 'dispute', 'Litige ouvert',
    'Un litige a été ouvert sur la commande #' || left(o.id::text, 8) || ' : ' || left(p_reason, 80) || '. Le paiement reste bloqué pendant la médiation.',
    jsonb_build_object('dispute_id', v_id, 'order_id', o.id));
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.open_dispute(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text, text) TO authenticated;

-- The other party also sees the thread and can add evidence.
DROP POLICY IF EXISTS "Dispute participants can view events" ON public.dispute_events;
CREATE POLICY "Dispute participants can view events" ON public.dispute_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM disputes d WHERE d.id = dispute_id AND auth.uid() IN (d.opened_by, d.against_user)) OR public.is_admin());
DROP POLICY IF EXISTS "Dispute participants add events" ON public.dispute_events;
CREATE POLICY "Dispute participants add events" ON public.dispute_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND event_type IN ('message','evidence')
    AND EXISTS (SELECT 1 FROM disputes d WHERE d.id = dispute_id AND auth.uid() IN (d.opened_by, d.against_user) AND d.status NOT IN ('resolved','closed','rejected')));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dispute-evidence', 'dispute-evidence', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Dispute evidence upload" ON storage.objects;
CREATE POLICY "Dispute evidence upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dispute-evidence' AND EXISTS (SELECT 1 FROM public.disputes d
    WHERE d.id::text = (storage.foldername(name))[1] AND auth.uid() IN (d.opened_by, d.against_user)));
DROP POLICY IF EXISTS "Dispute evidence read" ON storage.objects;
CREATE POLICY "Dispute evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dispute-evidence' AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.disputes d
    WHERE d.id::text = (storage.foldername(name))[1] AND auth.uid() IN (d.opened_by, d.against_user))));

-- Admin decision. Refund goes to the buyer's wallet; the rest (minus 10 %) to the seller.
CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute_id uuid, p_outcome text, p_refund numeric DEFAULT 0, p_resolution text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d disputes; o orders; e escrow_transactions; v_refund numeric; v_rest numeric; v_seller numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé à l''administrateur'; END IF;
  IF p_outcome NOT IN ('refund_full','refund_partial','release','reject') THEN RAISE EXCEPTION 'Décision inconnue'; END IF;
  SELECT * INTO d FROM disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR d.status IN ('resolved','closed','rejected') THEN RAISE EXCEPTION 'Litige introuvable ou déjà clos'; END IF;
  SELECT * INTO o FROM orders WHERE id = d.order_id FOR UPDATE;
  SELECT * INTO e FROM escrow_transactions WHERE order_id = o.id AND status = 'held' FOR UPDATE;

  IF p_outcome = 'reject' THEN
    UPDATE disputes SET status = 'rejected', resolution = left(p_resolution, 2000), refund_amount = 0, updated_at = now() WHERE id = d.id;
  ELSE
    IF e.id IS NULL THEN RAISE EXCEPTION 'Aucun paiement bloqué pour cette commande (paiement à la livraison ou déjà libéré) : réglez-le à la main'; END IF;
    v_refund := CASE p_outcome WHEN 'refund_full' THEN e.total_amount WHEN 'release' THEN 0 ELSE LEAST(GREATEST(round(COALESCE(p_refund, 0)), 0), e.total_amount) END;
    IF p_outcome = 'refund_partial' AND (v_refund <= 0 OR v_refund >= e.total_amount) THEN RAISE EXCEPTION 'Montant partiel entre 1 et % FCFA', e.total_amount - 1; END IF;
    v_rest := e.total_amount - v_refund;
    v_seller := round(v_rest * 0.9);
    IF v_refund > 0 THEN
      UPDATE wallets SET balance = balance + v_refund, updated_at = now() WHERE user_id = o.buyer_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
      VALUES (o.buyer_id, 'refund', v_refund, 'Remboursement litige #' || left(o.id::text, 8), o.id, 'completed');
    END IF;
    IF v_seller > 0 THEN
      INSERT INTO wallets (user_id) VALUES (o.seller_id) ON CONFLICT (user_id) DO NOTHING;
      UPDATE wallets SET balance = balance + v_seller, total_earned = total_earned + v_seller, updated_at = now() WHERE user_id = o.seller_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
      VALUES (o.seller_id, 'escrow_release', v_seller, 'Litige réglé #' || left(o.id::text, 8), o.id, 'completed');
    END IF;
    UPDATE escrow_transactions SET status = CASE WHEN v_refund = e.total_amount THEN 'refunded' ELSE 'released' END, released_at = now(),
      seller_amount = v_seller, platform_commission = v_rest - v_seller WHERE id = e.id;
    UPDATE orders SET status = CASE WHEN v_refund = e.total_amount THEN 'refunded' ELSE 'completed' END WHERE id = o.id;
    UPDATE disputes SET status = 'resolved', resolution = left(p_resolution, 2000), refund_amount = v_refund, updated_at = now() WHERE id = d.id;
  END IF;
  INSERT INTO dispute_events (dispute_id, user_id, event_type, content) VALUES (d.id, auth.uid(), 'resolution',
    CASE p_outcome WHEN 'reject' THEN 'Réclamation rejetée' WHEN 'release' THEN 'Paiement versé au vendeur' WHEN 'refund_full' THEN 'Remboursement intégral'
      ELSE 'Remboursement partiel de ' || v_refund || ' FCFA' END || COALESCE(' — ' || left(p_resolution, 500), ''));
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT u, 'dispute', 'Litige réglé', COALESCE(left(p_resolution, 200), 'Décision prise par l''équipe MIYASHI.'), jsonb_build_object('dispute_id', d.id)
  FROM unnest(ARRAY[d.opened_by, d.against_user]) u WHERE u IS NOT NULL;
  RETURN jsonb_build_object('success', true, 'refund', COALESCE(v_refund, 0));
END $$;
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, numeric, text) TO authenticated;

-------------------------------------------------------------------------------
-- 5. Delivery: price before ordering (GPS of the shop and of the address), live driver position.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quote_delivery(p_seller_id uuid, p_address_id uuid, p_vehicle text DEFAULT 'moto')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s shops; a addresses; la1 double precision; ln1 double precision; la2 double precision; ln2 double precision; d double precision; km numeric; pr record; v_gps boolean;
BEGIN
  SELECT * INTO a FROM addresses WHERE id = p_address_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Adresse introuvable'; END IF;
  SELECT * INTO s FROM shops WHERE owner_id = p_seller_id;
  la1 := s.lat; ln1 := s.lng;
  IF la1 IS NULL THEN SELECT c.lat, c.lng INTO la1, ln1 FROM public.city_point(s.city) c; END IF;
  IF la1 IS NULL THEN SELECT c.lat, c.lng INTO la1, ln1 FROM public.city_point((SELECT location FROM profiles WHERE user_id = p_seller_id)) c; END IF;
  la2 := a.lat; ln2 := a.lng;
  IF la2 IS NULL THEN SELECT c.lat, c.lng INTO la2, ln2 FROM public.city_point(concat_ws(', ', a.district, a.city)) c; END IF;
  v_gps := s.lat IS NOT NULL AND a.lat IS NOT NULL;
  d := public.km_between(la1, ln1, la2, ln2);
  km := CASE WHEN d IS NULL THEN 5 ELSE GREATEST(2, round((d * CASE WHEN v_gps THEN 1.25 ELSE 1.3 END)::numeric, 1)) END;
  SELECT * INTO pr FROM public.calculate_delivery_price(km, extract(hour FROM now() AT TIME ZONE 'UTC') >= 19, COALESCE(p_vehicle, 'moto'));
  RETURN jsonb_build_object('distance_km', km, 'price', round(pr.total), 'precise', v_gps);
END $$;
REVOKE EXECUTE ON FUNCTION public.quote_delivery(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_delivery(uuid, uuid, text) TO authenticated;

-- With exact GPS on both sides the delivery estimate uses a smaller road factor.
CREATE OR REPLACE FUNCTION public.estimate_delivery_km(p_order_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; s shops; a addresses; la1 double precision; ln1 double precision; la2 double precision; ln2 double precision; d double precision;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 5; END IF;
  SELECT * INTO s FROM shops WHERE owner_id = o.seller_id;
  la1 := s.lat; ln1 := s.lng;
  IF la1 IS NULL THEN SELECT c.lat, c.lng INTO la1, ln1 FROM public.city_point(COALESCE(s.city, (SELECT location FROM products WHERE id = o.product_id))) c; END IF;
  IF o.address_id IS NOT NULL THEN SELECT * INTO a FROM addresses WHERE id = o.address_id; END IF;
  la2 := a.lat; ln2 := a.lng;
  IF la2 IS NULL THEN SELECT c.lat, c.lng INTO la2, ln2 FROM public.city_point(COALESCE(concat_ws(', ', a.district, a.city), o.shipping_address)) c; END IF;
  d := public.km_between(la1, ln1, la2, ln2);
  IF d IS NULL THEN RETURN 5; END IF;
  RETURN GREATEST(2, round((d * CASE WHEN s.lat IS NOT NULL AND a.lat IS NOT NULL THEN 1.25 ELSE 1.3 END)::numeric, 1));
END $$;
REVOKE EXECUTE ON FUNCTION public.estimate_delivery_km(uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS driver_lat double precision, ADD COLUMN IF NOT EXISTS driver_lng double precision,
  ADD COLUMN IF NOT EXISTS driver_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.update_driver_location(p_delivery_id uuid, p_lat double precision, p_lng double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Position invalide'; END IF;
  IF NOT public.hit_rate_limit('driver_loc:' || auth.uid(), 240, 3600) THEN RETURN; END IF;
  UPDATE delivery_requests SET driver_lat = p_lat, driver_lng = p_lng, driver_seen_at = now()
  WHERE id = p_delivery_id AND driver_id = auth.uid() AND status IN ('accepted','picked_up');
END $$;
REVOKE EXECUTE ON FUNCTION public.update_driver_location(uuid, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_driver_location(uuid, double precision, double precision) TO authenticated;

-- For the buyer (and the seller): where the driver is, where the parcel goes, minutes left (25 km/h in town).
CREATE OR REPLACE FUNCTION public.get_delivery_tracking(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; d delivery_requests; a addresses; la2 double precision; ln2 double precision; km double precision;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR NOT (auth.uid() = o.buyer_id OR public.can_manage_seller(o.seller_id)) THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  SELECT * INTO d FROM delivery_requests WHERE order_id = o.id AND status IN ('accepted','picked_up','delivered') ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'no_driver'); END IF;
  IF o.address_id IS NOT NULL THEN SELECT * INTO a FROM addresses WHERE id = o.address_id; END IF;
  la2 := a.lat; ln2 := a.lng;
  IF la2 IS NULL THEN SELECT c.lat, c.lng INTO la2, ln2 FROM public.city_point(COALESCE(concat_ws(', ', a.district, a.city), o.shipping_address)) c; END IF;
  km := public.km_between(d.driver_lat, d.driver_lng, la2, ln2);
  RETURN jsonb_build_object('status', d.status, 'driver', CASE WHEN d.driver_lat IS NOT NULL THEN jsonb_build_object('lat', d.driver_lat, 'lng', d.driver_lng, 'seen_at', d.driver_seen_at) END,
    'destination', CASE WHEN la2 IS NOT NULL THEN jsonb_build_object('lat', la2, 'lng', ln2) END,
    'distance_km', round(km::numeric, 1), 'eta_min', CASE WHEN km IS NOT NULL THEN GREATEST(2, ceil(km * 1.3 / 25 * 60)) END, 'vehicle', d.vehicle_type);
END $$;
REVOKE EXECUTE ON FUNCTION public.get_delivery_tracking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_tracking(uuid) TO authenticated;

-------------------------------------------------------------------------------
-- 6. External notifications (e-mail, WhatsApp, SMS) for the key steps.
-------------------------------------------------------------------------------
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((NEW.data->>'user_sent')::boolean, false) THEN RETURN NULL; END IF;
  IF NEW.type IN ('order','wallet','offer','quote','booking','group_buy','stock','dispute','payout','shop_invite','security','partner',
                  'delivery','delivery_request','savings','service_request','warning') THEN
    PERFORM public.call_internal_function('notify-dispatch', jsonb_build_object('notification_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;

-------------------------------------------------------------------------------
-- 7. Savings reminders: 2 days before each instalment, then every 3 days while late.
-------------------------------------------------------------------------------
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;
CREATE OR REPLACE FUNCTION public.savings_reminders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals; n int := 0; v_due numeric;
BEGIN
  FOR g IN SELECT * FROM savings_goals WHERE status = 'active' AND plan = 'installments' AND next_due_date IS NOT NULL
      AND saved_amount < target_amount AND (last_reminded_at IS NULL OR last_reminded_at < now() - interval '60 hours') LOOP
    v_due := LEAST(g.installment_amount, g.target_amount - g.saved_amount);
    IF g.next_due_date BETWEEN current_date AND current_date + 2 THEN
      INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Tranche à verser bientôt',
        round(v_due) || ' FCFA pour « ' || g.title || ' » avant le ' || to_char(g.next_due_date, 'DD/MM') || '.', jsonb_build_object('savings_id', g.id));
    ELSIF g.next_due_date < current_date THEN
      INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Tranche en retard',
        'La tranche de ' || round(v_due) || ' FCFA pour « ' || g.title || ' » était due le ' || to_char(g.next_due_date, 'DD/MM') ||
        '. L''article reste réservé jusqu''au ' || to_char(g.deadline, 'DD/MM') || '.', jsonb_build_object('savings_id', g.id));
    ELSE CONTINUE;
    END IF;
    UPDATE savings_goals SET last_reminded_at = now() WHERE id = g.id;
    n := n + 1;
  END LOOP;
  -- Free deposits: a nudge one week before the deadline.
  FOR g IN SELECT * FROM savings_goals WHERE status = 'active' AND plan = 'free' AND deadline = current_date + 7 AND saved_amount < target_amount
      AND (last_reminded_at IS NULL OR last_reminded_at < now() - interval '60 hours') LOOP
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (g.user_id, 'savings', 'Plus qu''une semaine',
      'Il reste ' || round(g.target_amount - g.saved_amount) || ' FCFA à verser pour « ' || g.title || ' » avant le ' || to_char(g.deadline, 'DD/MM') || '.', jsonb_build_object('savings_id', g.id));
    UPDATE savings_goals SET last_reminded_at = now() WHERE id = g.id; n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.savings_reminders() FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  PERFORM cron.unschedule('miyashi-savings-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'miyashi-savings-reminders');
  PERFORM cron.schedule('miyashi-savings-reminders', '11 8 * * *', 'SELECT public.savings_reminders()');
END $$;

-------------------------------------------------------------------------------
-- 8. Verified reviews: only after a completed order, with photos; drivers rated too.
-------------------------------------------------------------------------------
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target text NOT NULL DEFAULT 'listing';
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_target_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_target_check CHECK (target IN ('listing','driver') AND cardinality(photos) <= 4);

CREATE OR REPLACE FUNCTION public.guard_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; v_driver uuid;
BEGIN
  IF public.has_role(NEW.reviewer_id, 'admin') AND NEW.order_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Note entre 1 et 5'; END IF;
  IF NEW.order_id IS NULL THEN RAISE EXCEPTION 'Un avis se laisse depuis une commande reçue ou une prestation terminée'; END IF;
  SELECT * INTO o FROM orders WHERE id = NEW.order_id;
  IF NOT FOUND OR o.buyer_id <> NEW.reviewer_id THEN RAISE EXCEPTION 'Seul l''acheteur de la commande peut laisser un avis'; END IF;
  IF o.status NOT IN ('completed','shipped') THEN RAISE EXCEPTION 'Laissez votre avis après la réception'; END IF;
  IF NEW.target = 'driver' THEN
    SELECT driver_id INTO v_driver FROM delivery_requests WHERE order_id = o.id AND status = 'delivered' ORDER BY delivered_at DESC LIMIT 1;
    IF v_driver IS NULL THEN RAISE EXCEPTION 'Aucun livreur pour cette commande'; END IF;
    NEW.reviewed_user_id := v_driver; NEW.product_id := NULL; NEW.service_id := NULL;
  ELSE
    NEW.reviewed_user_id := o.seller_id; NEW.product_id := o.product_id; NEW.service_id := o.service_id;
  END IF;
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = NEW.order_id AND r.reviewer_id = NEW.reviewer_id AND r.target = NEW.target) THEN
    RAISE EXCEPTION 'Vous avez déjà donné votre avis sur cette commande';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.photos) p WHERE p !~ '^https://') THEN RAISE EXCEPTION 'Photo invalide'; END IF;
  NEW.is_verified := true;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_review ON public.reviews;
CREATE TRIGGER guard_review BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review();
REVOKE EXECUTE ON FUNCTION public.guard_review() FROM PUBLIC, anon, authenticated;

-- Driver rating follows their reviews.
CREATE OR REPLACE FUNCTION public.sync_driver_rating() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target = 'driver' THEN
    UPDATE driver_profiles SET average_rating = (SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE reviewed_user_id = NEW.reviewed_user_id AND target = 'driver')
    WHERE user_id = NEW.reviewed_user_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sync_driver_rating ON public.reviews;
CREATE TRIGGER sync_driver_rating AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.sync_driver_rating();
REVOKE EXECUTE ON FUNCTION public.sync_driver_rating() FROM PUBLIC, anon, authenticated;

-- Review photos (public, under the reviewer's folder).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Review photos upload" ON storage.objects;
CREATE POLICY "Review photos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Average rating per person (used by the rankings as a tie-breaker and shown next to names).
CREATE OR REPLACE FUNCTION public.user_rating(p_user uuid, p_target text DEFAULT 'listing')
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE reviewed_user_id = p_user AND target = p_target
$$;
GRANT EXECUTE ON FUNCTION public.user_rating(uuid, text) TO anon, authenticated;

-- Followers hear about a followed seller's new products (at most one notice per seller a day).
CREATE OR REPLACE FUNCTION public.notify_followers_new_product() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_active THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM products p WHERE p.seller_id = NEW.seller_id AND p.id <> NEW.id AND p.created_at > now() - interval '1 day') THEN RETURN NULL; END IF;
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT f.follower_id, 'follow', 'Nouveauté chez ' || COALESCE((SELECT name FROM shops WHERE owner_id = NEW.seller_id), 'un vendeur suivi'),
    NEW.title, jsonb_build_object('product_id', NEW.id)
  FROM follows f WHERE f.followed_id = NEW.seller_id LIMIT 500;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS notify_followers_new_product ON public.products;
CREATE TRIGGER notify_followers_new_product AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_followers_new_product();
REVOKE EXECUTE ON FUNCTION public.notify_followers_new_product() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.dispatch_notification() FROM PUBLIC, anon, authenticated;
