-- Ordering a service: everything happens in the app.
-- 1) The client describes the need (no price needed; on site or remote, place, date, budget).
-- 2) Client and provider discuss formalities, conditions and terms in the conversation.
-- 3) The provider sends a quote with the contract terms (start, duration, place, conditions).
-- 4) The client accepts the terms and pays: the money stays in escrow; the provider starts only then.
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  conversation_id uuid,
  details text NOT NULL,
  on_site boolean NOT NULL DEFAULT false,
  location text,
  preferred_date date,
  budget numeric CHECK (budget IS NULL OR budget >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','quoted','accepted','declined','cancelled')),
  quote_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_provider_idx ON public.service_requests (provider_id, status);
CREATE INDEX IF NOT EXISTS service_requests_client_idx ON public.service_requests (client_id, status);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parties see service requests" ON public.service_requests;
CREATE POLICY "Parties see service requests" ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (client_id, provider_id) OR public.is_admin());

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS duration_days int CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 365),
  ADD COLUMN IF NOT EXISTS on_site boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- The conversation between two people (created if needed).
CREATE OR REPLACE FUNCTION public._conversation_between(a uuid, b uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT id INTO v FROM conversations WHERE (participant_1 = a AND participant_2 = b) OR (participant_1 = b AND participant_2 = a) ORDER BY created_at LIMIT 1;
  IF v IS NULL THEN INSERT INTO conversations (participant_1, participant_2) VALUES (a, b) RETURNING id INTO v; END IF;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public._conversation_between(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_service(p_service_id uuid, p_details text, p_on_site boolean DEFAULT false,
  p_location text DEFAULT NULL, p_date date DEFAULT NULL, p_budget numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s services; v_conv uuid; v_id uuid; m record; v_text text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF NOT public.hit_rate_limit('request_service:' || auth.uid(), 20, 86400) THEN RAISE EXCEPTION 'Trop de demandes aujourd''hui'; END IF;
  SELECT * INTO s FROM services WHERE id = p_service_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service introuvable'; END IF;
  IF s.provider_id = auth.uid() THEN RAISE EXCEPTION 'C''est votre propre service'; END IF;
  IF char_length(btrim(COALESCE(p_details, ''))) < 10 THEN RAISE EXCEPTION 'Décrivez votre besoin (10 caractères minimum)'; END IF;
  IF p_on_site AND char_length(btrim(COALESCE(p_location, ''))) < 2 THEN RAISE EXCEPTION 'Indiquez le lieu de la prestation'; END IF;
  IF p_date IS NOT NULL AND p_date < current_date THEN RAISE EXCEPTION 'La date est déjà passée'; END IF;
  SELECT * INTO m FROM public.mask_contacts(left(p_details, 3000));
  IF m.hits > 0 THEN PERFORM public._record_contact_violation(auth.uid(), 'service_request', p_service_id, m.masked); END IF;
  v_conv := public._conversation_between(auth.uid(), s.provider_id);
  INSERT INTO service_requests (service_id, client_id, provider_id, conversation_id, details, on_site, location, preferred_date, budget)
  VALUES (s.id, auth.uid(), s.provider_id, v_conv, m.masked, COALESCE(p_on_site, false), left((public.mask_contacts(p_location)).masked, 200), p_date,
    CASE WHEN p_budget > 0 THEN round(p_budget) END)
  RETURNING id INTO v_id;
  v_text := '📋 Demande de prestation : ' || s.title || E'\n' || m.masked ||
    CASE WHEN p_on_site THEN E'\n📍 Sur place : ' || (public.mask_contacts(p_location)).masked ELSE E'\n💻 À distance' END ||
    CASE WHEN p_date IS NOT NULL THEN E'\n📅 Souhaité le ' || to_char(p_date, 'DD/MM/YYYY') ELSE '' END ||
    CASE WHEN p_budget > 0 THEN E'\n💰 Budget indicatif : ' || round(p_budget) || ' FCFA' ELSE '' END ||
    E'\nDiscutons ici des conditions ; le paiement se fera sur MIYASHI (séquestre) avant le début.';
  INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type) VALUES (v_conv, auth.uid(), s.provider_id, v_text, 'service_request');
  UPDATE conversations SET last_message_at = now() WHERE id = v_conv;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (s.provider_id, 'service_request', 'Nouvelle demande de prestation',
    s.title || CASE WHEN p_on_site THEN ' · sur place' ELSE '' END, jsonb_build_object('request_id', v_id, 'conversation_id', v_conv));
  RETURN jsonb_build_object('success', true, 'request_id', v_id, 'conversation_id', v_conv);
END $$;
REVOKE EXECUTE ON FUNCTION public.request_service(uuid, text, boolean, text, date, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_service(uuid, text, boolean, text, date, numeric) TO authenticated;

-- Provider declines a request (the conversation stays).
CREATE OR REPLACE FUNCTION public.decline_service_request(p_id uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r service_requests;
BEGIN
  SELECT * INTO r FROM service_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT (r.provider_id = auth.uid() OR r.client_id = auth.uid()) OR r.status NOT IN ('open','quoted') THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  UPDATE service_requests SET status = CASE WHEN r.client_id = auth.uid() THEN 'cancelled' ELSE 'declined' END, updated_at = now() WHERE id = r.id;
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (CASE WHEN r.client_id = auth.uid() THEN r.provider_id ELSE r.client_id END, 'service_request',
    CASE WHEN r.client_id = auth.uid() THEN 'Demande annulée par le client' ELSE 'Demande de prestation déclinée' END,
    COALESCE(left(p_reason, 200), ''), jsonb_build_object('request_id', r.id));
END $$;
REVOKE EXECUTE ON FUNCTION public.decline_service_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_service_request(uuid, text) TO authenticated;

-- Quotes carry the contract terms and appear in the conversation.
DROP FUNCTION IF EXISTS public.send_quote(uuid, text, jsonb, uuid, text, integer);
CREATE OR REPLACE FUNCTION public.send_quote(p_client_id uuid, p_title text, p_items jsonb, p_service_id uuid DEFAULT NULL, p_notes text DEFAULT NULL,
  p_valid_days int DEFAULT 15, p_terms text DEFAULT NULL, p_start_date date DEFAULT NULL, p_duration_days int DEFAULT NULL,
  p_on_site boolean DEFAULT false, p_location text DEFAULT NULL, p_request_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric := 0; it jsonb; v_id uuid; r service_requests; v_conv uuid;
BEGIN
  PERFORM public.require_space('provider');
  IF auth.uid() IS NULL OR p_client_id = auth.uid() THEN RAISE EXCEPTION 'Client invalide'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Ajoutez au moins une ligne'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF COALESCE((it->>'qty')::numeric, 0) <= 0 OR COALESCE((it->>'unit_price')::numeric, -1) < 0 OR char_length(COALESCE(it->>'label','')) < 2 THEN
      RAISE EXCEPTION 'Ligne de devis invalide';
    END IF;
    v_total := v_total + (it->>'qty')::numeric * (it->>'unit_price')::numeric;
  END LOOP;
  IF p_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM services WHERE id = p_service_id AND provider_id = auth.uid()) THEN RAISE EXCEPTION 'Service invalide'; END IF;
  IF p_start_date IS NOT NULL AND p_start_date < current_date THEN RAISE EXCEPTION 'La date de début est passée'; END IF;
  IF p_on_site AND char_length(btrim(COALESCE(p_location, ''))) < 2 THEN RAISE EXCEPTION 'Indiquez le lieu de la prestation'; END IF;
  IF p_request_id IS NOT NULL THEN
    SELECT * INTO r FROM service_requests WHERE id = p_request_id AND provider_id = auth.uid() AND client_id = p_client_id FOR UPDATE;
    IF NOT FOUND OR r.status NOT IN ('open','quoted') THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  END IF;
  INSERT INTO quotes (provider_id, client_id, service_id, title, items, total, notes, valid_until, terms, start_date, duration_days, on_site, location, request_id)
  VALUES (auth.uid(), p_client_id, COALESCE(p_service_id, r.service_id), (public.mask_contacts(p_title)).masked, p_items, round(v_total), left((public.mask_contacts(p_notes)).masked, 2000),
    current_date + LEAST(GREATEST(p_valid_days,1),90), left((public.mask_contacts(p_terms)).masked, 4000), p_start_date, p_duration_days, COALESCE(p_on_site, false),
    left((public.mask_contacts(p_location)).masked, 200), p_request_id)
  RETURNING id INTO v_id;
  IF p_request_id IS NOT NULL THEN UPDATE service_requests SET status = 'quoted', quote_id = v_id, updated_at = now() WHERE id = p_request_id; END IF;
  v_conv := public._conversation_between(auth.uid(), p_client_id);
  INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type)
  VALUES (v_conv, auth.uid(), p_client_id, '🧾 Devis : ' || p_title || ' — ' || round(v_total) || ' FCFA' ||
    CASE WHEN p_start_date IS NOT NULL THEN E'\nDébut : ' || to_char(p_start_date, 'DD/MM/YYYY') ELSE '' END ||
    CASE WHEN p_duration_days IS NOT NULL THEN ' · durée : ' || p_duration_days || ' j' ELSE '' END ||
    E'\nAcceptez les conditions et payez sur MIYASHI : l''argent reste en séquestre jusqu''à la fin de la prestation.', 'quote');
  UPDATE conversations SET last_message_at = now() WHERE id = v_conv;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (p_client_id, 'quote', 'Nouveau devis',
    p_title || ' — ' || round(v_total)::text || ' FCFA', jsonb_build_object('quote_id', v_id, 'conversation_id', v_conv));
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_quote(uuid, text, jsonb, uuid, text, int, text, date, int, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_quote(uuid, text, jsonb, uuid, text, int, text, date, int, boolean, text, uuid) TO authenticated;

-- Accepting = agreeing to the terms + paying into escrow. The order says the provider may start.
CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id uuid, p_address text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q quotes; v_order uuid; v_notes text;
BEGIN
  SELECT * INTO q FROM quotes WHERE id = p_quote_id AND client_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR q.status <> 'sent' THEN RAISE EXCEPTION 'Devis introuvable'; END IF;
  IF q.valid_until < current_date THEN UPDATE quotes SET status = 'expired' WHERE id = q.id; RAISE EXCEPTION 'Devis expiré'; END IF;
  UPDATE wallets SET balance = balance - q.total, updated_at = now() WHERE user_id = auth.uid() AND balance >= q.total;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  v_notes := 'Devis : ' || q.title ||
    CASE WHEN q.start_date IS NOT NULL THEN ' · début ' || to_char(q.start_date, 'DD/MM/YYYY') ELSE '' END ||
    CASE WHEN q.duration_days IS NOT NULL THEN ' · ' || q.duration_days || ' j' ELSE '' END ||
    CASE WHEN q.on_site THEN ' · sur place : ' || COALESCE(q.location, '') ELSE '' END ||
    CASE WHEN q.terms IS NOT NULL THEN E'\nConditions acceptées : ' || left(q.terms, 1500) ELSE '' END;
  INSERT INTO orders (buyer_id, seller_id, service_id, quantity, total_price, unit_price, status, payment_status, shipping_address, notes, payment_mode, source, source_id)
  VALUES (auth.uid(), q.provider_id, q.service_id, 1, q.total, q.total, 'pending', 'paid', COALESCE(p_address, q.location, ''), v_notes, 'wallet', 'quote', q.id)
  RETURNING id INTO v_order;
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
  VALUES (auth.uid(), 'purchase', -q.total, 'Devis accepté : ' || q.title, v_order, 'wallet', 'completed');
  INSERT INTO payments (order_id, payer_id, amount, payment_method, status, metadata) VALUES (v_order, auth.uid(), q.total, 'wallet', 'completed', jsonb_build_object('quote_id', q.id));
  INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status)
  VALUES (v_order, auth.uid(), q.total, round(q.total * 0.9), q.total - round(q.total * 0.9), 'held');
  UPDATE quotes SET status = 'accepted', order_id = v_order, terms_accepted_at = now() WHERE id = q.id;
  IF q.request_id IS NOT NULL THEN UPDATE service_requests SET status = 'accepted', updated_at = now() WHERE id = q.request_id; END IF;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (q.provider_id, 'quote', 'Devis accepté et payé 🎉',
    q.title || ' — ' || q.total::text || ' FCFA sont bloqués en séquestre : vous pouvez commencer.', jsonb_build_object('quote_id', q.id, 'order_id', v_order));
  RETURN jsonb_build_object('success', true, 'order_id', v_order);
END $$;

-- Services are ordered through the functions only (no unpaid order written by the screen).
DROP POLICY IF EXISTS "Buyers can create unpaid orders" ON public.orders;
