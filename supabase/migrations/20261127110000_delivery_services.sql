-- MIYASHI delivery and services features
-- 25 delivery zones and fees        26 pickup points / store pickup
-- 27 proof of delivery              29 multi-parcel routes
-- 30 cross-border customs estimate  31 booking slots
-- 32 quotes                         33 portfolio
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ───────────────────────── Zones (25) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  city text NOT NULL,
  district text,                      -- NULL = whole city
  base_fee numeric NOT NULL CHECK (base_fee >= 0),
  eta_hours int NOT NULL DEFAULT 24 CHECK (eta_hours > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, city, district)
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zones are public" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Admins manage zones" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
-- Starting tariffs (editable by the admin in Admin → Livraison).
INSERT INTO public.delivery_zones (country, city, district, base_fee, eta_hours) VALUES
  ('TG','Lomé',NULL,1000,24), ('TG','Kara',NULL,1500,48), ('TG','Sokodé',NULL,1500,48), ('TG','Kpalimé',NULL,1500,48),
  ('BJ','Cotonou',NULL,1000,24), ('BJ','Porto-Novo',NULL,1500,48), ('CI','Abidjan',NULL,1500,24), ('CI','Bouaké',NULL,2000,48),
  ('SN','Dakar',NULL,1500,24), ('BF','Ouagadougou',NULL,1500,24), ('ML','Bamako',NULL,1500,24), ('NE','Niamey',NULL,1500,24)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.find_delivery_zone(p_country text, p_city text, p_district text DEFAULT NULL)
RETURNS public.delivery_zones LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM delivery_zones WHERE is_active AND country = upper(p_country) AND lower(city) = lower(trim(p_city))
    AND (district IS NULL OR lower(district) = lower(trim(COALESCE(p_district, ''))))
  ORDER BY district NULLS LAST LIMIT 1
$$;

-- ───────────────────────── Pickup points (26) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'TG',
  lat double precision,
  lng double precision,
  opening_hours text,
  phone text,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pickup points are public" ON public.pickup_points FOR SELECT USING (true);
CREATE POLICY "Admins manage pickup points" ON public.pickup_points FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
ALTER TABLE public.orders ADD CONSTRAINT orders_pickup_point_fk FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_zone_fk FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_pickup_partner(p_point uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM pickup_points WHERE id = p_point AND partner_id = auth.uid())
$$;

-- Partners see the parcels waiting at their point.
CREATE POLICY "Pickup partners view their parcels" ON public.orders FOR SELECT TO authenticated
  USING (pickup_point_id IS NOT NULL AND public.is_pickup_partner(pickup_point_id));

CREATE OR REPLACE FUNCTION public.mark_parcel_at_pickup(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR o.pickup_point_id IS NULL OR NOT public.is_pickup_partner(o.pickup_point_id) THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  UPDATE orders SET delivery_status = 'at_pickup_point' WHERE id = o.id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'order', 'Colis disponible au point relais',
    'Votre colis #' || left(o.id::text, 8) || ' vous attend. Présentez votre code de retrait.', jsonb_build_object('order_id', o.id));
END $$;

-- ───────────────────────── Proof of delivery (27) ─────────────────────────
ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS proof_photo_path text,
  ADD COLUMN IF NOT EXISTS proof_signature_path text,
  ADD COLUMN IF NOT EXISTS proof_recipient_name text,
  ADD COLUMN IF NOT EXISTS proof_code_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_location jsonb,
  ADD COLUMN IF NOT EXISTS route_id uuid,
  ADD COLUMN IF NOT EXISTS route_position int;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('delivery-proofs', 'delivery-proofs', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Drivers upload delivery proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'delivery-proofs' AND EXISTS (SELECT 1 FROM public.delivery_requests d
    WHERE d.id::text = (storage.foldername(name))[1] AND d.driver_id = (select auth.uid())));
CREATE POLICY "Parties read delivery proofs" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'delivery-proofs' AND EXISTS (SELECT 1 FROM public.delivery_requests d
    WHERE d.id::text = (storage.foldername(name))[1] AND (select auth.uid()) IN (d.driver_id, d.buyer_id, d.seller_id)));

CREATE OR REPLACE FUNCTION public.submit_delivery_proof(p_delivery_id uuid, p_photo_path text, p_signature_path text DEFAULT NULL,
  p_code text DEFAULT NULL, p_recipient text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delivery_requests; v_verified boolean := false; v_has_code boolean; v_res jsonb;
BEGIN
  SELECT * INTO d FROM delivery_requests WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND OR d.driver_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Livraison introuvable'; END IF;
  IF d.status NOT IN ('accepted','picked_up') THEN RAISE EXCEPTION 'Livraison déjà clôturée'; END IF;
  IF p_photo_path IS NULL OR split_part(p_photo_path, '/', 1) <> d.id::text THEN RAISE EXCEPTION 'Photo de preuve requise'; END IF;
  v_has_code := EXISTS (SELECT 1 FROM order_codes WHERE order_id = d.order_id AND used_at IS NULL);
  IF v_has_code THEN
    IF p_code IS NULL THEN RAISE EXCEPTION 'Demandez le code de remise au client'; END IF;
    v_res := public.confirm_handover(d.order_id, p_code);
    IF NOT (v_res->>'success')::boolean THEN RETURN v_res; END IF;
    v_verified := true;
  END IF;
  UPDATE delivery_requests SET status = 'delivered', delivered_at = now(), proof_photo_path = p_photo_path,
    proof_signature_path = p_signature_path, proof_recipient_name = left(p_recipient, 120), proof_code_verified = v_verified,
    proof_location = CASE WHEN p_lat IS NOT NULL THEN jsonb_build_object('lat', p_lat, 'lng', p_lng) END
  WHERE id = d.id;
  UPDATE orders SET status = CASE WHEN status IN ('completed','cancelled') THEN status ELSE 'shipped' END,
    delivery_status = 'delivered', actual_delivery = COALESCE(actual_delivery, now()) WHERE id = d.order_id;
  RETURN jsonb_build_object('success', true, 'code_verified', v_verified);
END $$;

-- Drivers may no longer mark "delivered" without a proof.
CREATE OR REPLACE FUNCTION public.guard_delivery_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    RAISE EXCEPTION 'Enregistrez la preuve de livraison (photo + code)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_delivery_update ON public.delivery_requests;
CREATE TRIGGER guard_delivery_update BEFORE UPDATE ON public.delivery_requests FOR EACH ROW EXECUTE FUNCTION public.guard_delivery_update();

-- ───────────────────────── Routes (29) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','done')),
  total_km numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Driver sees own routes" ON public.delivery_routes FOR SELECT TO authenticated USING ((select auth.uid()) = driver_id);
ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_route_fk FOREIGN KEY (route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

-- p_ordered: delivery ids in the order the driver will do them (computed in the app).
CREATE OR REPLACE FUNCTION public.create_delivery_route(p_ordered uuid[], p_total_km numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; i int;
BEGIN
  IF array_length(p_ordered, 1) IS NULL OR array_length(p_ordered, 1) > 25 THEN RAISE EXCEPTION 'Entre 1 et 25 livraisons'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ordered) x LEFT JOIN delivery_requests d ON d.id = x
             WHERE d.id IS NULL OR d.driver_id IS DISTINCT FROM auth.uid() OR d.status NOT IN ('accepted','picked_up')) THEN
    RAISE EXCEPTION 'Seules vos livraisons en cours peuvent être regroupées';
  END IF;
  UPDATE delivery_routes SET status = 'done' WHERE driver_id = auth.uid() AND status = 'active';
  INSERT INTO delivery_routes (driver_id, total_km) VALUES (auth.uid(), p_total_km) RETURNING id INTO v_id;
  FOR i IN 1 .. array_length(p_ordered, 1) LOOP
    UPDATE delivery_requests SET route_id = v_id, route_position = i WHERE id = p_ordered[i];
  END LOOP;
  RETURN v_id;
END $$;

-- ───────────────────────── Customs (30) and VAT ─────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_rates (
  country text PRIMARY KEY,
  name text NOT NULL,
  rate numeric NOT NULL CHECK (rate >= 0 AND rate < 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tax rates are public" ON public.tax_rates FOR SELECT USING (true);
CREATE POLICY "Admins manage tax rates" ON public.tax_rates FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.tax_rates (country, name, rate) VALUES
  ('TG','Togo',18), ('BJ','Bénin',18), ('CI','Côte d''Ivoire',18), ('SN','Sénégal',18), ('BF','Burkina Faso',18),
  ('ML','Mali',18), ('NE','Niger',19), ('GW','Guinée-Bissau',17), ('GN','Guinée',18), ('GH','Ghana',15), ('NG','Nigeria',7.5), ('CM','Cameroun',19.25)
ON CONFLICT (country) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customs_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone text NOT NULL,     -- a country code, or 'UEMOA' / 'CEDEAO' / '*'
  to_country text NOT NULL,
  duty_rate numeric NOT NULL DEFAULT 0,
  fixed_fee numeric NOT NULL DEFAULT 0,
  apply_vat boolean NOT NULL DEFAULT true,
  note text,
  priority int NOT NULL DEFAULT 0
);
ALTER TABLE public.customs_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customs rules are public" ON public.customs_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage customs rules" ON public.customs_rules FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.customs_rules (from_zone, to_country, duty_rate, fixed_fee, apply_vat, note, priority)
SELECT 'UEMOA', c, 0, 0, false, 'Libre circulation UEMOA pour les produits originaires (certificat d''origine).', 10
FROM unnest(ARRAY['TG','BJ','CI','SN','BF','ML','NE','GW']) c
UNION ALL SELECT '*', c, 20, 0, true, 'Estimation : tarif extérieur commun CEDEAO (5 à 35 % selon le produit) + TVA du pays.', 0
FROM unnest(ARRAY['TG','BJ','CI','SN','BF','ML','NE','GW','GN','GH','NG']) c;

CREATE OR REPLACE FUNCTION public.estimate_customs(p_from text, p_to text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE r customs_rules; v_uemoa text[] := ARRAY['TG','BJ','CI','SN','BF','ML','NE','GW']; v_vat numeric := 0; v_duty numeric; v_tax numeric := 0;
BEGIN
  IF upper(p_from) = upper(p_to) THEN RETURN jsonb_build_object('cross_border', false); END IF;
  SELECT * INTO r FROM customs_rules
  WHERE to_country = upper(p_to) AND (from_zone = upper(p_from) OR from_zone = '*'
     OR (from_zone = 'UEMOA' AND upper(p_from) = ANY(v_uemoa) AND upper(p_to) = ANY(v_uemoa)))
  ORDER BY priority DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('cross_border', true, 'known', false); END IF;
  v_duty := round(p_amount * r.duty_rate / 100) + r.fixed_fee;
  IF r.apply_vat THEN
    SELECT rate INTO v_vat FROM tax_rates WHERE country = upper(p_to);
    v_tax := round((p_amount + v_duty) * COALESCE(v_vat, 0) / 100);
  END IF;
  RETURN jsonb_build_object('cross_border', true, 'known', true, 'duty', v_duty, 'vat', v_tax, 'vat_rate', COALESCE(v_vat,0),
    'duty_rate', r.duty_rate, 'total', v_duty + v_tax, 'note', r.note);
END $$;
GRANT EXECUTE ON FUNCTION public.estimate_customs(text, text, numeric) TO anon, authenticated;

-- ───────────────────────── Bookings (31) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  slot_minutes int NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 480)
);
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS provider_availability_idx ON public.provider_availability(provider_id, weekday);
CREATE POLICY "Availability is public" ON public.provider_availability FOR SELECT USING (true);
CREATE POLICY "Providers manage availability" ON public.provider_availability FOR ALL TO authenticated
  USING ((select auth.uid()) = provider_id) WITH CHECK ((select auth.uid()) = provider_id);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','done')),
  notes text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist
  (provider_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed');
CREATE POLICY "Parties see bookings" ON public.bookings FOR SELECT TO authenticated USING ((select auth.uid()) IN (provider_id, client_id));

-- Free slots for one day (timezone: Africa/Abidjan = UTC, used across West Africa's GMT countries).
CREATE OR REPLACE FUNCTION public.get_available_slots(p_service_id uuid, p_date date)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT provider_id FROM services WHERE id = p_service_id AND is_active),
  slots AS (
    SELECT gs AS st, gs + make_interval(mins => a.slot_minutes) AS en
    FROM provider_availability a JOIN s ON s.provider_id = a.provider_id
    CROSS JOIN LATERAL generate_series((p_date + a.start_time) AT TIME ZONE 'Africa/Abidjan',
      (p_date + a.end_time) AT TIME ZONE 'Africa/Abidjan' - make_interval(mins => a.slot_minutes), make_interval(mins => a.slot_minutes)) gs
    WHERE a.weekday = extract(dow FROM p_date)::int
  )
  SELECT st, en FROM slots
  WHERE st > now() + interval '1 hour'
    AND NOT EXISTS (SELECT 1 FROM bookings b, s WHERE b.provider_id = s.provider_id AND b.status = 'confirmed'
                    AND tstzrange(b.starts_at, b.ends_at) && tstzrange(st, en))
  ORDER BY st
$$;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_slot(p_service_id uuid, p_starts_at timestamptz, p_notes text DEFAULT NULL, p_address text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slot record; v_svc services; v_res jsonb; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_svc FROM services WHERE id = p_service_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service introuvable'; END IF;
  SELECT * INTO v_slot FROM public.get_available_slots(p_service_id, (p_starts_at AT TIME ZONE 'Africa/Abidjan')::date) s WHERE s.starts_at = p_starts_at;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce créneau n''est plus disponible'; END IF;
  v_res := public._place_order(auth.uid(), jsonb_build_object('service_id', p_service_id, 'quantity', 1, 'payment_mode', 'wallet',
    'shipping_address', COALESCE(p_address, ''), 'notes', 'Rendez-vous le ' || to_char(p_starts_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM/YYYY HH24:MI') ||
    CASE WHEN p_notes IS NOT NULL THEN ' — ' || p_notes ELSE '' END, 'source', 'booking'));
  INSERT INTO bookings (service_id, provider_id, client_id, starts_at, ends_at, notes, order_id)
  VALUES (p_service_id, v_svc.provider_id, auth.uid(), v_slot.starts_at, v_slot.ends_at, left(p_notes, 500), (v_res->>'order_id')::uuid)
  RETURNING id INTO v_id;
  UPDATE orders SET source_id = v_id WHERE id = (v_res->>'order_id')::uuid;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_svc.provider_id, 'booking', 'Nouveau rendez-vous',
    v_svc.title || ' le ' || to_char(v_slot.starts_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM à HH24:MI'), jsonb_build_object('booking_id', v_id));
  RETURN jsonb_build_object('success', true, 'booking_id', v_id, 'order_id', v_res->>'order_id');
END $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id AND auth.uid() IN (client_id, provider_id) FOR UPDATE;
  IF NOT FOUND OR b.status <> 'confirmed' THEN RAISE EXCEPTION 'Rendez-vous introuvable'; END IF;
  IF auth.uid() = b.client_id AND b.starts_at < now() + interval '24 hours' THEN
    RAISE EXCEPTION 'Annulation possible jusqu''à 24 h avant le rendez-vous';
  END IF;
  UPDATE bookings SET status = 'cancelled' WHERE id = b.id;
  IF b.order_id IS NOT NULL THEN UPDATE orders SET status = 'cancelled' WHERE id = b.order_id AND status NOT IN ('completed','cancelled'); END IF;
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (CASE WHEN auth.uid() = b.client_id THEN b.provider_id ELSE b.client_id END, 'booking', 'Rendez-vous annulé',
    'Le rendez-vous du ' || to_char(b.starts_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM à HH24:MI') || ' est annulé et remboursé.', jsonb_build_object('booking_id', b.id));
END $$;

-- ───────────────────────── Quotes (32) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  items jsonb NOT NULL,          -- [{"label":"Main d'oeuvre","qty":1,"unit_price":15000}]
  total numeric NOT NULL CHECK (total > 0),
  notes text,
  valid_until date NOT NULL DEFAULT (current_date + 15),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','rejected','expired','cancelled')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS quotes_client_idx ON public.quotes(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_provider_idx ON public.quotes(provider_id, created_at DESC);
CREATE POLICY "Parties see quotes" ON public.quotes FOR SELECT TO authenticated USING ((select auth.uid()) IN (provider_id, client_id));

CREATE OR REPLACE FUNCTION public.send_quote(p_client_id uuid, p_title text, p_items jsonb, p_service_id uuid DEFAULT NULL, p_notes text DEFAULT NULL, p_valid_days int DEFAULT 15)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric := 0; it jsonb; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_client_id = auth.uid() THEN RAISE EXCEPTION 'Client invalide'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Ajoutez au moins une ligne'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF COALESCE((it->>'qty')::numeric, 0) <= 0 OR COALESCE((it->>'unit_price')::numeric, -1) < 0 OR char_length(COALESCE(it->>'label','')) < 2 THEN
      RAISE EXCEPTION 'Ligne de devis invalide';
    END IF;
    v_total := v_total + (it->>'qty')::numeric * (it->>'unit_price')::numeric;
  END LOOP;
  IF p_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM services WHERE id = p_service_id AND provider_id = auth.uid()) THEN RAISE EXCEPTION 'Service invalide'; END IF;
  INSERT INTO quotes (provider_id, client_id, service_id, title, items, total, notes, valid_until)
  VALUES (auth.uid(), p_client_id, p_service_id, p_title, p_items, round(v_total), left(p_notes, 2000), current_date + LEAST(GREATEST(p_valid_days,1),90))
  RETURNING id INTO v_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (p_client_id, 'quote', 'Nouveau devis',
    p_title || ' — ' || round(v_total)::text || ' FCFA', jsonb_build_object('quote_id', v_id));
  RETURN v_id;
END $$;

-- Accepting pays the quote from the wallet into escrow.
CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id uuid, p_address text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q quotes; v_order uuid;
BEGIN
  SELECT * INTO q FROM quotes WHERE id = p_quote_id AND client_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR q.status <> 'sent' THEN RAISE EXCEPTION 'Devis introuvable'; END IF;
  IF q.valid_until < current_date THEN UPDATE quotes SET status = 'expired' WHERE id = q.id; RAISE EXCEPTION 'Devis expiré'; END IF;
  UPDATE wallets SET balance = balance - q.total, updated_at = now() WHERE user_id = auth.uid() AND balance >= q.total;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO orders (buyer_id, seller_id, service_id, quantity, total_price, unit_price, status, payment_status, shipping_address, notes, payment_mode, source, source_id)
  VALUES (auth.uid(), q.provider_id, q.service_id, 1, q.total, q.total, 'pending', 'paid', COALESCE(p_address, ''), 'Devis : ' || q.title, 'wallet', 'quote', q.id)
  RETURNING id INTO v_order;
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
  VALUES (auth.uid(), 'purchase', -q.total, 'Devis accepté : ' || q.title, v_order, 'wallet', 'completed');
  INSERT INTO payments (order_id, payer_id, amount, payment_method, status, metadata) VALUES (v_order, auth.uid(), q.total, 'wallet', 'completed', jsonb_build_object('quote_id', q.id));
  INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status)
  VALUES (v_order, auth.uid(), q.total, round(q.total * 0.9), q.total - round(q.total * 0.9), 'held');
  UPDATE quotes SET status = 'accepted', order_id = v_order WHERE id = q.id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (q.provider_id, 'quote', 'Devis accepté 🎉',
    q.title || ' — ' || q.total::text || ' FCFA sont bloqués en séquestre.', jsonb_build_object('quote_id', q.id, 'order_id', v_order));
  RETURN jsonb_build_object('success', true, 'order_id', v_order);
END $$;

CREATE OR REPLACE FUNCTION public.reject_quote(p_quote_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE quotes SET status = CASE WHEN auth.uid() = provider_id THEN 'cancelled' ELSE 'rejected' END
  WHERE id = p_quote_id AND auth.uid() IN (client_id, provider_id) AND status = 'sent';
$$;

-- ───────────────────────── Portfolio (33) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description text CHECK (char_length(description) <= 1500),
  media_url text NOT NULL CHECK (media_url ~ '^https://'),
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  link_url text CHECK (link_url IS NULL OR link_url ~ '^https?://'),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS portfolio_items_user_idx ON public.portfolio_items(user_id, sort_order);
CREATE POLICY "Portfolios are public" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "Own portfolio" ON public.portfolio_items FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['mark_parcel_at_pickup(uuid)','submit_delivery_proof(uuid,text,text,text,text,double precision,double precision)',
    'create_delivery_route(uuid[],numeric)','book_slot(uuid,timestamptz,text,text)','cancel_booking(uuid)',
    'send_quote(uuid,text,jsonb,uuid,text,int)','accept_quote(uuid,text)','reject_quote(uuid)','is_pickup_partner(uuid)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
