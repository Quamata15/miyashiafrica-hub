-- Spaces (roles) follow clear rules.
--  * The admin holds every space, with no limit.
--  * Everyone else keeps the buyer space and may open up to 3 professional spaces.
--  * Spaces with a conflict of interest cannot be held together. After closing one, the
--    opposite space opens only 30 days later, so nobody switches sides to read the other
--    side's data (candidates, deliveries).
--  * Every write that belongs to a space checks that its owner holds that space, whatever the
--    path: screen, API or database function.

-- Rules ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_conflicts (
  role_a public.app_role NOT NULL,
  role_b public.app_role NOT NULL,
  reason text NOT NULL,
  PRIMARY KEY (role_a, role_b)
);
ALTER TABLE public.role_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Space rules are public" ON public.role_conflicts;
CREATE POLICY "Space rules are public" ON public.role_conflicts FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.role_conflicts TO anon, authenticated;

INSERT INTO public.role_conflicts (role_a, role_b, reason) VALUES
  ('freelance', 'employer', 'on ne peut pas recruter et candidater avec le même compte : un recruteur verrait les candidatures de ses concurrents et pourrait répondre à ses propres offres'),
  ('seller', 'freelance', 'un compte vendeur est une activité commerciale ; l''espace Freelance est réservé aux personnes qui cherchent des missions et des emplois'),
  ('seller', 'driver', 'un vendeur ne peut pas livrer ses propres commandes : la preuve de remise libère l''argent du séquestre')
ON CONFLICT (role_a, role_b) DO UPDATE SET reason = EXCLUDED.reason;

CREATE OR REPLACE FUNCTION public.space_limit() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 3 $$;
CREATE OR REPLACE FUNCTION public.space_cooldown() RETURNS interval LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT interval '30 days' $$;

CREATE OR REPLACE FUNCTION public.space_label(p_role public.app_role) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_role WHEN 'buyer' THEN 'Acheteur' WHEN 'seller' THEN 'Vendeur' WHEN 'provider' THEN 'Prestataire' WHEN 'freelance' THEN 'Freelance'
    WHEN 'employer' THEN 'Recruteur' WHEN 'driver' THEN 'Livreur' ELSE 'Administrateur' END
$$;

CREATE OR REPLACE FUNCTION public.roles_conflict(a public.app_role, b public.app_role) RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT reason FROM role_conflicts WHERE (role_a = a AND role_b = b) OR (role_a = b AND role_b = a) LIMIT 1
$$;

-- History of openings and closings (used for the 30-day delay and shown to the user).
CREATE TABLE IF NOT EXISTS public.user_role_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('activated', 'deactivated')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_role_events_user_idx ON public.user_role_events (user_id, created_at DESC);
ALTER TABLE public.user_role_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own space history" ON public.user_role_events;
CREATE POLICY "Own space history" ON public.user_role_events FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.has_role((SELECT auth.uid()), 'admin'));
GRANT SELECT ON public.user_role_events TO authenticated;

-- Opening a space ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_role_rules() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_held public.app_role; v_reason text; v_count int; v_closed record;
BEGIN
  IF NEW.role IN ('admin', 'buyer') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('user_roles:' || NEW.user_id::text, 0));
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, NEW.role) THEN RETURN NEW; END IF;

  SELECT r.role, public.roles_conflict(NEW.role, r.role) INTO v_held, v_reason
  FROM user_roles r WHERE r.user_id = NEW.user_id AND public.roles_conflict(NEW.role, r.role) IS NOT NULL LIMIT 1;
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'L''espace % n''est pas compatible avec votre espace % : %.', public.space_label(NEW.role), public.space_label(v_held), v_reason;
  END IF;

  SELECT count(*) INTO v_count FROM user_roles WHERE user_id = NEW.user_id AND role NOT IN ('buyer', 'admin');
  IF v_count >= public.space_limit() THEN
    RAISE EXCEPTION 'Vous avez déjà % espaces professionnels, le maximum. Fermez-en un pour ouvrir l''espace %.', v_count, public.space_label(NEW.role);
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    SELECT e.role, e.created_at INTO v_closed FROM user_role_events e
    WHERE e.user_id = NEW.user_id AND e.action = 'deactivated' AND e.created_at > now() - public.space_cooldown()
      AND public.roles_conflict(NEW.role, e.role) IS NOT NULL
    ORDER BY e.created_at DESC LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Vous avez fermé l''espace % le %. L''espace % pourra être ouvert à partir du % (délai de 30 jours entre deux espaces incompatibles).',
        public.space_label(v_closed.role), to_char(v_closed.created_at, 'DD/MM/YYYY'), public.space_label(NEW.role),
        to_char(v_closed.created_at + public.space_cooldown(), 'DD/MM/YYYY');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_role_rules ON public.user_roles;
CREATE TRIGGER check_role_rules BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.check_role_rules();

-- Closing a space hides what belonged to it; the history keeps both moves.
CREATE OR REPLACE FUNCTION public.after_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_role_events (user_id, role, action, actor_id) VALUES (NEW.user_id, NEW.role, 'activated', auth.uid());
    RETURN NEW;
  END IF;
  -- Account deletion cascades here: nothing left to hide or record.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN RETURN OLD; END IF;
  INSERT INTO user_role_events (user_id, role, action, actor_id) VALUES (OLD.user_id, OLD.role, 'deactivated', auth.uid());
  IF public.has_role(OLD.user_id, 'admin') THEN RETURN OLD; END IF;
  CASE OLD.role
    WHEN 'seller' THEN
      UPDATE products SET is_active = false WHERE seller_id = OLD.user_id AND is_active;
      IF NOT public.has_role(OLD.user_id, 'provider') THEN
        UPDATE promo_codes SET is_active = false WHERE seller_id = OLD.user_id AND is_active;
        UPDATE promotions SET is_active = false WHERE user_id = OLD.user_id AND is_active;
      END IF;
    WHEN 'provider' THEN
      UPDATE services SET is_active = false WHERE provider_id = OLD.user_id AND is_active;
      UPDATE provider_profiles SET is_available = false WHERE user_id = OLD.user_id;
      UPDATE quotes SET status = 'cancelled' WHERE provider_id = OLD.user_id AND status = 'sent';
      IF NOT public.has_role(OLD.user_id, 'seller') THEN
        UPDATE promo_codes SET is_active = false WHERE seller_id = OLD.user_id AND is_active;
        UPDATE promotions SET is_active = false WHERE user_id = OLD.user_id AND is_active;
      END IF;
    WHEN 'employer' THEN
      UPDATE jobs SET is_active = false WHERE employer_id = OLD.user_id AND is_active;
    WHEN 'freelance' THEN
      UPDATE freelance_profiles SET open_to_work = false WHERE user_id = OLD.user_id;
      UPDATE applications SET stage = 'withdrawn' WHERE freelance_id = OLD.user_id AND stage IN ('new', 'screening', 'shortlisted');
    WHEN 'driver' THEN
      UPDATE driver_profiles SET is_available = false WHERE user_id = OLD.user_id;
      UPDATE delivery_requests SET driver_id = NULL WHERE driver_id = OLD.user_id AND status = 'pending';
    ELSE NULL;
  END CASE;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS after_role_change ON public.user_roles;
CREATE TRIGGER after_role_change AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.after_role_change();

-- Opening goes through functions only (no direct insert from the app).
DROP POLICY IF EXISTS "Users can insert own non-admin roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.assign_own_role(p_role public.app_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_role = 'admin' THEN RAISE EXCEPTION 'Rôle interdit'; END IF;
  IF p_role = 'driver' AND NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Inscrivez-vous comme livreur : zone, véhicule, permis et signature de la charte';
  END IF;
  INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), p_role) ON CONFLICT (user_id, role) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.assign_own_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_own_role(public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_driver(p_zone text, p_vehicle text, p_license text DEFAULT NULL, p_phone text DEFAULT NULL, p_bio text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF char_length(trim(COALESCE(p_zone, ''))) < 2 THEN RAISE EXCEPTION 'Indiquez votre zone de livraison'; END IF;
  IF char_length(trim(COALESCE(p_vehicle, ''))) < 2 OR char_length(p_vehicle) > 30 THEN RAISE EXCEPTION 'Indiquez votre véhicule'; END IF;
  INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'driver') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO driver_profiles (user_id, zone, vehicle_type, license_number)
  VALUES (auth.uid(), left(trim(p_zone), 80), left(trim(p_vehicle), 30), NULLIF(left(trim(COALESCE(p_license, '')), 40), ''))
  ON CONFLICT (user_id) DO UPDATE SET zone = EXCLUDED.zone, vehicle_type = EXCLUDED.vehicle_type, license_number = COALESCE(EXCLUDED.license_number, driver_profiles.license_number);
  UPDATE profiles SET phone = COALESCE(NULLIF(left(trim(COALESCE(p_phone, '')), 30), ''), phone), bio = COALESCE(NULLIF(left(trim(COALESCE(p_bio, '')), 1000), ''), bio)
  WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END $$;

-- Closing a space: only when nothing is in progress there.
CREATE OR REPLACE FUNCTION public.deactivate_own_role(p_role public.app_role) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_role IN ('admin', 'buyer') THEN RAISE EXCEPTION 'Cet espace ne peut pas être fermé'; END IF;
  IF NOT public.has_role(v_uid, p_role) THEN RETURN jsonb_build_object('success', true); END IF;
  IF p_role IN ('seller', 'provider') THEN
    SELECT count(*) INTO n FROM orders WHERE seller_id = v_uid AND status NOT IN ('completed', 'cancelled', 'refunded')
      AND CASE WHEN p_role = 'seller' THEN product_id IS NOT NULL ELSE service_id IS NOT NULL END;
    IF n > 0 THEN RAISE EXCEPTION '% commande(s) en cours : terminez-les avant de fermer l''espace %.', n, public.space_label(p_role); END IF;
  END IF;
  IF p_role = 'provider' AND EXISTS (SELECT 1 FROM bookings WHERE provider_id = v_uid AND status = 'confirmed' AND starts_at > now()) THEN
    RAISE EXCEPTION 'Vous avez des rendez-vous à venir : honorez-les ou annulez-les avant de fermer l''espace Prestataire.';
  END IF;
  IF p_role = 'employer' THEN
    IF EXISTS (SELECT 1 FROM interviews WHERE employer_id = v_uid AND status IN ('scheduled', 'in_progress')) THEN
      RAISE EXCEPTION 'Vous avez des entretiens prévus : annulez-les ou terminez-les avant de fermer l''espace Recruteur.';
    END IF;
    IF EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = v_uid AND a.stage = 'offer') THEN
      RAISE EXCEPTION 'Des propositions d''embauche attendent une réponse : clôturez-les avant de fermer l''espace Recruteur.';
    END IF;
  END IF;
  IF p_role = 'freelance' THEN
    IF EXISTS (SELECT 1 FROM interviews WHERE candidate_id = v_uid AND status IN ('scheduled', 'in_progress')) THEN
      RAISE EXCEPTION 'Vous avez des entretiens prévus : passez-les ou prévenez le recruteur avant de fermer l''espace Freelance.';
    END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE freelance_id = v_uid AND stage IN ('interview', 'offer')) THEN
      RAISE EXCEPTION 'Des candidatures sont en entretien ou en proposition : retirez-les avant de fermer l''espace Freelance.';
    END IF;
  END IF;
  IF p_role = 'driver' AND EXISTS (SELECT 1 FROM delivery_requests WHERE driver_id = v_uid AND status IN ('accepted', 'picked_up')) THEN
    RAISE EXCEPTION 'Terminez vos courses en cours avant de fermer l''espace Livreur.';
  END IF;
  DELETE FROM user_roles WHERE user_id = v_uid AND role = p_role;
  RETURN jsonb_build_object('success', true);
END $$;

-- What the user can open, and why not.
CREATE OR REPLACE FUNCTION public.get_space_options() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_admin boolean; v_roles public.app_role[]; v_used int; r public.app_role; v_out jsonb := '[]';
        v_reason text; v_with public.app_role; v_from timestamptz; v_closed record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  v_admin := public.has_role(v_uid, 'admin');
  SELECT COALESCE(array_agg(role), '{}') INTO v_roles FROM user_roles WHERE user_id = v_uid;
  SELECT count(*) INTO v_used FROM unnest(v_roles) x WHERE x NOT IN ('buyer', 'admin');
  FOREACH r IN ARRAY ARRAY['seller', 'provider', 'freelance', 'employer', 'driver']::public.app_role[] LOOP
    v_reason := NULL; v_with := NULL; v_from := NULL;
    IF NOT (r = ANY (v_roles)) AND NOT v_admin THEN
      SELECT x, public.roles_conflict(r, x) INTO v_with, v_reason FROM unnest(v_roles) x WHERE public.roles_conflict(r, x) IS NOT NULL LIMIT 1;
      IF v_reason IS NOT NULL THEN
        v_reason := 'Incompatible avec votre espace ' || public.space_label(v_with) || ' : ' || v_reason || '.';
      ELSIF v_used >= public.space_limit() THEN
        v_reason := 'Maximum de ' || public.space_limit() || ' espaces professionnels atteint : fermez-en un pour ouvrir celui-ci.';
      ELSE
        SELECT e.role, e.created_at INTO v_closed FROM user_role_events e
        WHERE e.user_id = v_uid AND e.action = 'deactivated' AND e.created_at > now() - public.space_cooldown() AND public.roles_conflict(r, e.role) IS NOT NULL
        ORDER BY e.created_at DESC LIMIT 1;
        IF FOUND THEN
          v_from := v_closed.created_at + public.space_cooldown();
          v_reason := 'Vous avez fermé l''espace ' || public.space_label(v_closed.role) || ' récemment : ouverture possible à partir du ' || to_char(v_from, 'DD/MM/YYYY') || '.';
        END IF;
      END IF;
    END IF;
    v_out := v_out || jsonb_build_object('role', r, 'label', public.space_label(r), 'active', r = ANY (v_roles), 'available', r = ANY (v_roles) OR v_reason IS NULL,
      'reason', v_reason, 'conflict_with', v_with, 'available_from', v_from,
      'needs_registration', r = 'driver' AND NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = v_uid));
  END LOOP;
  RETURN jsonb_build_object('is_admin', v_admin, 'limit', public.space_limit(), 'used', v_used, 'roles', v_out,
    'conflicts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('a', role_a, 'b', role_b, 'reason', reason)), '[]') FROM role_conflicts));
END $$;

-- Sign-up: the role picked on the form goes through the same rules (driver needs its registration).
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text := NEW.raw_user_meta_data ->> 'role';
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'), NEW.phone)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer') ON CONFLICT (user_id, role) DO NOTHING;
  IF v_role IN ('seller', 'provider', 'freelance', 'employer') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Writes that belong to a space ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.space_ok(p_user uuid, VARIADIC p_roles public.app_role[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user AND (role = ANY (p_roles) OR role = 'admin'))
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;

-- Raised from database functions that serve one space.
CREATE OR REPLACE FUNCTION public.require_space(VARIADIC p_roles public.app_role[]) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') IN ('anon', 'authenticated') THEN RAISE EXCEPTION 'Connexion requise'; END IF;
    RETURN; -- service jobs and maintenance sessions
  END IF;
  IF NOT public.space_ok(auth.uid(), VARIADIC p_roles) THEN
    RAISE EXCEPTION 'Réservé à l''espace % : activez-le depuis votre tableau de bord.', (SELECT string_agg(public.space_label(x), ' ou ') FROM unnest(p_roles) x)
      USING ERRCODE = '42501';
  END IF;
END $$;

-- Trigger: TG_ARGV = owner column, "active" column (or '-'), then the spaces allowed.
-- Inserts always check the owner's space; updates only check when content is switched back on,
-- so closing a space, refunds and stock returns keep working.
CREATE OR REPLACE FUNCTION public.enforce_space() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new jsonb := to_jsonb(NEW); v_owner uuid; v_col text := NULLIF(TG_ARGV[1], '-'); v_roles public.app_role[];
BEGIN
  v_owner := (v_new ->> TG_ARGV[0])::uuid;
  IF v_owner IS NULL THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF v_col IS NULL OR NOT COALESCE((v_new ->> v_col)::boolean, false) OR COALESCE((to_jsonb(OLD) ->> v_col)::boolean, false) THEN RETURN NEW; END IF;
  END IF;
  v_roles := TG_ARGV[2:TG_NARGS - 1]::public.app_role[];
  IF public.space_ok(v_owner, VARIADIC v_roles) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Réservé à l''espace % : activez-le depuis votre tableau de bord.', (SELECT string_agg(public.space_label(x), ' ou ') FROM unnest(v_roles) x)
    USING ERRCODE = '42501';
END $$;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('products', 'seller_id', 'is_active', 'seller'),
    ('services', 'provider_id', 'is_active', 'provider'),
    ('jobs', 'employer_id', 'is_active', 'employer'),
    ('promo_codes', 'seller_id', 'is_active', 'seller,provider'),
    ('promotions', 'user_id', 'is_active', 'seller,provider'),
    ('shops', 'owner_id', '-', 'seller'),
    ('shipping_labels', 'seller_id', '-', 'seller'),
    ('group_buys', 'seller_id', '-', 'seller'),
    ('campaigns', 'user_id', '-', 'seller,provider,employer,freelance'),
    ('boosts', 'user_id', '-', 'seller,provider,employer,freelance'),
    ('quotes', 'provider_id', '-', 'provider'),
    ('provider_invoices', 'provider_id', '-', 'provider'),
    ('provider_profiles', 'user_id', 'is_available', 'provider'),
    ('provider_availability', 'provider_id', '-', 'provider'),
    ('portfolio_items', 'user_id', '-', 'provider,freelance'),
    ('employer_profiles', 'user_id', '-', 'employer'),
    ('recruiter_templates', 'owner_id', '-', 'employer'),
    ('saved_candidates', 'employer_id', '-', 'employer'),
    ('interviews', 'employer_id', '-', 'employer'),
    ('applications', 'freelance_id', '-', 'freelance'),
    ('freelance_profiles', 'user_id', 'open_to_work', 'freelance'),
    ('saved_jobs', 'user_id', '-', 'freelance'),
    ('driver_profiles', 'user_id', 'is_available', 'driver')
  ) AS x(tbl, owner_col, active_col, roles) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforce_space ON public.%I', t.tbl);
    EXECUTE format('CREATE TRIGGER enforce_space BEFORE INSERT %s ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_space(%L, %L, %s)',
      CASE WHEN t.active_col = '-' THEN '' ELSE format('OR UPDATE OF %I', t.active_col) END, t.tbl, t.owner_col, t.active_col,
      (SELECT string_agg(quote_literal(r), ', ') FROM unnest(string_to_array(t.roles, ',')) r));
  END LOOP;
END $$;

-- Deliveries: only a registered driver, never on an order they buy or sell.
CREATE OR REPLACE FUNCTION public.guard_delivery_driver() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.driver_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.driver_id IS NOT DISTINCT FROM OLD.driver_id) THEN RETURN NEW; END IF;
  IF NOT public.has_role(NEW.driver_id, 'driver') THEN RAISE EXCEPTION 'Ce livreur n''est pas inscrit sur MIYASHI'; END IF;
  IF NEW.driver_id IN (NEW.seller_id, NEW.buyer_id) AND NOT public.has_role(NEW.driver_id, 'admin') THEN
    RAISE EXCEPTION 'Un livreur ne peut pas livrer une commande qu''il achète ou qu''il vend';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_delivery_driver ON public.delivery_requests;
CREATE TRIGGER guard_delivery_driver BEFORE INSERT OR UPDATE OF driver_id ON public.delivery_requests FOR EACH ROW EXECUTE FUNCTION public.guard_delivery_driver();

-- A driver takes a course (open to every available driver, or offered to them by the buyer).
-- The screen used to write the row directly, which the update rules refused when no driver was set.
CREATE OR REPLACE FUNCTION public.accept_delivery(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d delivery_requests;
BEGIN
  PERFORM public.require_space('driver');
  IF NOT public.hit_rate_limit('accept_delivery:' || auth.uid(), 60, 3600) THEN RAISE EXCEPTION 'Trop de tentatives, réessayez plus tard'; END IF;
  SELECT * INTO d FROM delivery_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' OR (d.driver_id IS NOT NULL AND d.driver_id <> auth.uid()) THEN RAISE EXCEPTION 'Cette course n''est plus disponible'; END IF;
  IF NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = auth.uid() AND is_available) THEN RAISE EXCEPTION 'Passez en mode disponible pour accepter une course'; END IF;
  UPDATE delivery_requests SET driver_id = auth.uid(), status = 'accepted', accepted_at = now() WHERE id = p_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (d.buyer_id, 'delivery', 'Livreur trouvé',
    'Un livreur a accepté votre livraison.', jsonb_build_object('delivery_id', d.id, 'order_id', d.order_id));
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.check_boost_target(p_type text, p_target uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CASE p_type
    WHEN 'product' THEN
      PERFORM public.require_space('seller');
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_target AND deleted_at IS NULL AND public.can_manage_seller(seller_id)) THEN RAISE EXCEPTION 'Choisissez un de vos produits'; END IF;
    WHEN 'service' THEN
      PERFORM public.require_space('provider');
      IF NOT EXISTS (SELECT 1 FROM services WHERE id = p_target AND provider_id = auth.uid()) THEN RAISE EXCEPTION 'Choisissez un de vos services'; END IF;
    WHEN 'job' THEN
      PERFORM public.require_space('employer');
      IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_target AND employer_id = auth.uid()) THEN RAISE EXCEPTION 'Choisissez une de vos offres'; END IF;
    WHEN 'freelance' THEN
      PERFORM public.require_space('freelance');
      IF p_target IS NOT NULL AND p_target <> auth.uid() AND NOT EXISTS (SELECT 1 FROM freelance_profiles WHERE id = p_target AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Vous ne pouvez booster que votre propre profil';
      END IF;
    WHEN 'profile' THEN
      PERFORM public.require_space('seller', 'provider', 'employer', 'freelance');
      IF p_target IS NOT NULL AND p_target <> auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez booster que votre propre profil'; END IF;
    ELSE RAISE EXCEPTION 'Type de mise en avant inconnu';
  END CASE;
END $$;

-- Database functions that serve one space: add the check at the top of their body.
DO $$
DECLARE f record; v_def text; v_new text; -- replaces the first occurrence only
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('recommended_jobs(integer)', E'\nBEGIN\n', E'\nBEGIN\n  PERFORM public.require_space(''freelance'');\n'),
    ('bulk_import_products(jsonb)', E'\nBEGIN\n', E'\nBEGIN\n  PERFORM public.require_space(''seller'');\n'),
    ('send_quote(uuid, text, jsonb, uuid, text, integer)', E'\nBEGIN\n', E'\nBEGIN\n  PERFORM public.require_space(''provider'');\n'),
    ('purchase_boost(text, uuid, text, integer, text, text, text, text, uuid)', E'\nBEGIN\n', E'\nBEGIN\n  PERFORM public.check_boost_target(p_boost_type, p_target_id);\n'),
    ('search_talent(text, text[], text, integer, integer)', 'WHERE f.open_to_work AND ', 'WHERE f.open_to_work AND public.has_role(f.user_id, ''freelance'') AND ')
  ) AS x(sig, find, repl) LOOP
    v_def := pg_get_functiondef(('public.' || f.sig)::regprocedure);
    CONTINUE WHEN position(f.repl IN v_def) > 0;
    IF position(f.find IN v_def) = 0 THEN RAISE EXCEPTION 'Could not patch %', f.sig; END IF;
    v_new := overlay(v_def PLACING f.repl FROM position(f.find IN v_def) FOR char_length(f.find));
    EXECUTE v_new;
  END LOOP;
END $$;

-- Rights -------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_role_rules(), public.after_role_change(), public.enforce_space(), public.guard_delivery_driver() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['register_driver(text, text, text, text, text)', 'deactivate_own_role(public.app_role)', 'get_space_options()', 'accept_delivery(uuid)',
    'check_boost_target(text, uuid)', 'require_space(public.app_role[])', 'space_ok(uuid, public.app_role[])'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.space_label(public.app_role), public.space_limit(), public.space_cooldown(), public.roles_conflict(public.app_role, public.app_role) TO anon, authenticated;
