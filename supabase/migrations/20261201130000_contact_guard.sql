-- Every order and every service is paid on MIYASHI. Phone numbers, e-mails and WhatsApp /
-- Telegram / social links are not exchanged between buyers and sellers, providers, freelances
-- or recruiters: in messages they are masked and the attempt is recorded; in listings and
-- profiles they are refused. Repeated attempts go to the admin for a sanction.
-- (Buying in person at a shop someone found on MIYASHI is not counted.)

-- Returns the text with contact details replaced by a placeholder, and how many were found.
CREATE OR REPLACE FUNCTION public.mask_contacts(p_text text, OUT masked text, OUT hits int)
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE t text := p_text; before text;
BEGIN
  hits := 0;
  IF t IS NULL OR t = '' THEN masked := t; RETURN; END IF;
  -- e-mails (the platform's own addresses stay)
  before := t;
  t := regexp_replace(t, '[A-Za-z0-9._%+-]+@(?!miyashi\.africa)[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[coordonnées masquées]', 'g');
  IF t <> before THEN hits := hits + 1; END IF;
  -- messaging apps and social profiles
  before := t;
  t := regexp_replace(t, '(https?://)?(www\.)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|m\.me|fb\.me|facebook\.com|instagram\.com|tiktok\.com|snapchat\.com|signal\.me)\S*', '[lien masqué]', 'gi');
  IF t <> before THEN hits := hits + 1; END IF;
  -- phone numbers: 8 digits or more, with spaces, dots, dashes or a leading +, not followed by a currency
  before := t;
  t := regexp_replace(t, '(\+|00)?[0-9][0-9 .()-]{6,}[0-9](?![0-9 ]*(f\M|fcfa|cfa|xof|francs?|%|km|kg))', '[numéro masqué]', 'gi');
  IF t <> before THEN hits := hits + 1; END IF;
  -- "whatsapp me", "appelle-moi au", spelled-out app names asking to leave the platform
  IF t ~* '\m(whats ?app|wats ?ap|telegram|signal|imo)\M' AND t ~* '\m(écris|ecris|contacte|appelle|ajoute|joins|numéro|numero|mon\s+num)' THEN hits := hits + 1; END IF;
  masked := t;
END $$;

-- Attempts, for warnings and sanctions.
CREATE TABLE IF NOT EXISTS public.contact_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,              -- message, product, service, job, profile, shop, review, quote
  target_id uuid,
  excerpt text,                      -- the masked text only, never the contact itself
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_violations_user_idx ON public.contact_violations (user_id, created_at DESC);
ALTER TABLE public.contact_violations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own violations" ON public.contact_violations;
CREATE POLICY "Own violations" ON public.contact_violations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public._record_contact_violation(p_user uuid, p_source text, p_target uuid, p_excerpt text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  INSERT INTO contact_violations (user_id, source, target_id, excerpt) VALUES (p_user, p_source, p_target, left(p_excerpt, 300));
  SELECT count(*) INTO n FROM contact_violations WHERE user_id = p_user AND created_at > now() - interval '30 days';
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (p_user, 'warning', 'Coordonnées masquées ⚠️',
    CASE WHEN n >= 3 THEN 'Plusieurs tentatives d''échange de coordonnées : votre compte est signalé à l''équipe MIYASHI (suspension possible, et poursuites en cas de fraude).'
         ELSE 'Les numéros, e-mails et liens WhatsApp ne s''échangent pas sur MIYASHI. Payez et échangez toujours sur la plateforme : c''est ce qui vous protège.' END,
    jsonb_build_object('count', n));
  -- Third attempt in 30 days: the admin decides on a sanction.
  IF n = 3 THEN
    INSERT INTO vendor_violations (seller_id, violation_type, description, status)
    VALUES (p_user, 'off_platform_contact', '3 tentatives d''échange de coordonnées en 30 jours (' || p_source || ')', 'pending');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._record_contact_violation(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

-- Messages: masked, recorded. Conversations with the support team (admin) are not filtered.
CREATE OR REPLACE FUNCTION public.guard_message_contacts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.content IS NULL OR public.has_role(NEW.sender_id, 'admin') OR (NEW.receiver_id IS NOT NULL AND public.has_role(NEW.receiver_id, 'admin')) THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.mask_contacts(NEW.content);
  IF r.hits > 0 THEN
    NEW.content := r.masked;
    PERFORM public._record_contact_violation(NEW.sender_id, 'message', NEW.conversation_id, r.masked);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_message_contacts ON public.messages;
CREATE TRIGGER guard_message_contacts BEFORE INSERT OR UPDATE OF content ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_message_contacts();

-- Listings and profiles: refused with a clear message (the person fixes the text).
-- Runs as the caller (not SECURITY DEFINER) so the role check sees who is writing; server
-- functions (stock updates, etc.) are not checked.
CREATE OR REPLACE FUNCTION public.guard_listing_contacts() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_owner uuid; v_text text; col text; r record;
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.is_admin() THEN RETURN NEW; END IF;
  v_owner := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  FOREACH col IN ARRAY TG_ARGV[1:] LOOP
    v_text := concat_ws(' ', v_text, to_jsonb(NEW) ->> col);
  END LOOP;
  SELECT * INTO r FROM public.mask_contacts(v_text);
  IF r.hits > 0 THEN
    RAISE EXCEPTION 'Retirez les numéros de téléphone, e-mails et liens WhatsApp ou réseaux sociaux : sur MIYASHI, les échanges et les paiements se font sur la plateforme.';
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('products', 'seller_id', ARRAY['title','description']),
    ('services', 'provider_id', ARRAY['title','description']),
    ('jobs', 'employer_id', ARRAY['title','description','company_name']),
    ('shops', 'owner_id', ARRAY['name','description','store_pickup_address']),
    ('freelance_profiles', 'user_id', ARRAY['title','bio']),
    ('provider_profiles', 'user_id', ARRAY['headline','about']),
    ('employer_profiles', 'user_id', ARRAY['about']),
    ('reviews', 'reviewer_id', ARRAY['comment']),
    ('quotes', 'provider_id', ARRAY['title','notes'])
  ) v(tbl, owner_col, cols) LOOP
    IF to_regclass('public.' || t.tbl) IS NULL THEN CONTINUE; END IF;
    -- skip columns that do not exist on this table
    IF EXISTS (SELECT 1 FROM unnest(t.cols) c WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = c))
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = t.owner_col) THEN
      RAISE NOTICE 'contact guard skipped on %', t.tbl; CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS guard_listing_contacts ON public.%I', t.tbl);
    EXECUTE format('CREATE TRIGGER guard_listing_contacts BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_listing_contacts(%L, %s)',
      t.tbl, t.owner_col, (SELECT string_agg(quote_literal(c), ', ') FROM unnest(t.cols) c));
  END LOOP;
END $$;

-- Profile bio too (public). Phone stays private in the profile and is used for delivery only.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
    DROP TRIGGER IF EXISTS guard_listing_contacts ON public.profiles;
    CREATE TRIGGER guard_listing_contacts BEFORE INSERT OR UPDATE OF bio ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_listing_contacts('user_id', 'bio');
  END IF;
END $$;

-- Reports of a deal made outside the platform (by a buyer, client or candidate).
CREATE OR REPLACE FUNCTION public.report_off_platform(p_user uuid, p_details text, p_order_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user = auth.uid() THEN RAISE EXCEPTION 'Signalement invalide'; END IF;
  IF NOT public.hit_rate_limit('report_off_platform:' || auth.uid(), 10, 86400) THEN RAISE EXCEPTION 'Trop de signalements aujourd''hui'; END IF;
  IF char_length(COALESCE(p_details, '')) < 10 THEN RAISE EXCEPTION 'Décrivez ce qui s''est passé (10 caractères minimum)'; END IF;
  INSERT INTO vendor_violations (seller_id, reported_by, order_id, violation_type, description, status)
  VALUES (p_user, auth.uid(), p_order_id, 'off_platform_payment', left(p_details, 2000), 'pending');
END $$;
REVOKE EXECUTE ON FUNCTION public.report_off_platform(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_off_platform(uuid, text, uuid) TO authenticated;
