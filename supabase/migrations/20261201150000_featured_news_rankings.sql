-- Featured content (chosen by the admin), news posts, and the weekly / monthly top 3 per profile.

-- 1. Featured flags. Only the admin sets them.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS featured_until timestamptz;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS featured_until timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS featured_until timestamptz;
ALTER TABLE public.freelance_profiles ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS featured_until timestamptz;
CREATE INDEX IF NOT EXISTS products_featured_idx ON public.products (is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS services_featured_idx ON public.services (is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS jobs_featured_idx ON public.jobs (is_featured) WHERE is_featured;

CREATE OR REPLACE FUNCTION public.guard_featured() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN NEW.is_featured := false; NEW.featured_until := NULL;
    ELSE NEW.is_featured := OLD.is_featured; NEW.featured_until := OLD.featured_until; END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','services','jobs','freelance_profiles'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_featured ON public.%I', t);
    EXECUTE format('CREATE TRIGGER guard_featured BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_featured()', t);
  END LOOP;
END $$;

-- Admin toggle for any listing.
CREATE OR REPLACE FUNCTION public.set_featured(p_kind text, p_id uuid, p_on boolean, p_days int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_until timestamptz := CASE WHEN p_on AND p_days IS NOT NULL THEN now() + make_interval(days => LEAST(GREATEST(p_days, 1), 365)) END;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé à l''administrateur'; END IF;
  IF p_kind = 'product' THEN UPDATE products SET is_featured = p_on, featured_until = v_until WHERE id = p_id;
  ELSIF p_kind = 'service' THEN UPDATE services SET is_featured = p_on, featured_until = v_until WHERE id = p_id;
  ELSIF p_kind = 'job' THEN UPDATE jobs SET is_featured = p_on, featured_until = v_until WHERE id = p_id;
  ELSIF p_kind = 'freelance' THEN UPDATE freelance_profiles SET is_featured = p_on, featured_until = v_until WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Type inconnu'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_featured(text, uuid, boolean, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_featured(text, uuid, boolean, int) TO authenticated;

-- Expired features switch off by themselves.
CREATE OR REPLACE FUNCTION public.expire_featured() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE products SET is_featured = false WHERE is_featured AND featured_until < now();
  UPDATE services SET is_featured = false WHERE is_featured AND featured_until < now();
  UPDATE jobs SET is_featured = false WHERE is_featured AND featured_until < now();
  UPDATE freelance_profiles SET is_featured = false WHERE is_featured AND featured_until < now();
$$;
REVOKE EXECUTE ON FUNCTION public.expire_featured() FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  PERFORM cron.unschedule('miyashi-featured-expiry') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'miyashi-featured-expiry');
  PERFORM cron.schedule('miyashi-featured-expiry', '9 * * * *', 'SELECT public.expire_featured()');
END $$;

-- 2. News ("Actus"), written by the admin.
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 5000),
  category text NOT NULL DEFAULT 'actualite' CHECK (category IN ('actualite','conseil','nouveaute','evenement','securite')),
  image_url text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  link_url text CHECK (link_url IS NULL OR link_url ~ '^(/|https://)'),
  is_pinned boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_posts_published_idx ON public.news_posts (published_at DESC);
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published news are public" ON public.news_posts;
CREATE POLICY "Published news are public" ON public.news_posts FOR SELECT TO anon, authenticated USING (published_at <= now() OR public.is_admin());
DROP POLICY IF EXISTS "Admin writes news" ON public.news_posts;
CREATE POLICY "Admin writes news" ON public.news_posts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Top 3 of the week or month for each profile. Scores come from real activity:
--    sellers: sales, then new articles, then views; providers: paid service orders and accepted
--    quotes, then new services; freelances: hires and shortlists, then applications;
--    recruiters: applications received, then offers published; drivers: deliveries made.
CREATE OR REPLACE FUNCTION public.get_rankings(p_period text DEFAULT 'week')
RETURNS TABLE (role text, rank int, user_id uuid, name text, avatar_url text, label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from timestamptz := now() - CASE WHEN p_period = 'month' THEN interval '30 days' ELSE interval '7 days' END;
BEGIN
  RETURN QUERY
  WITH sellers AS (
    SELECT ur.user_id,
      COALESCE((SELECT sum(o.total_price) FROM orders o WHERE o.seller_id = ur.user_id AND o.product_id IS NOT NULL AND o.created_at >= v_from AND o.status NOT IN ('cancelled','refunded') AND o.payment_status IN ('paid','cod_pending')), 0) AS a,
      (SELECT count(*) FROM products p WHERE p.seller_id = ur.user_id AND p.created_at >= v_from AND p.is_active) AS b,
      (SELECT count(*) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = ur.user_id AND v.viewed_at >= v_from) AS c
    FROM user_roles ur WHERE ur.role = 'seller'
  ), providers AS (
    SELECT ur.user_id,
      COALESCE((SELECT sum(o.total_price) FROM orders o WHERE o.seller_id = ur.user_id AND o.service_id IS NOT NULL AND o.created_at >= v_from AND o.payment_status = 'paid' AND o.status NOT IN ('cancelled','refunded')), 0) AS a,
      (SELECT count(*) FROM services s WHERE s.provider_id = ur.user_id AND s.created_at >= v_from AND s.is_active) AS b,
      (SELECT count(*) FROM service_requests r WHERE r.provider_id = ur.user_id AND r.created_at >= v_from) AS c
    FROM user_roles ur WHERE ur.role = 'provider'
  ), freelances AS (
    SELECT ur.user_id,
      (SELECT count(*) FROM applications ap WHERE ap.freelance_id = ur.user_id AND ap.stage IN ('hired','offer') AND ap.stage_changed_at >= v_from)::numeric AS a,
      (SELECT count(*) FROM applications ap WHERE ap.freelance_id = ur.user_id AND ap.stage IN ('shortlisted','interview') AND ap.stage_changed_at >= v_from) AS b,
      (SELECT count(*) FROM applications ap WHERE ap.freelance_id = ur.user_id AND ap.created_at >= v_from) AS c
    FROM user_roles ur WHERE ur.role = 'freelance'
  ), recruiters AS (
    SELECT ur.user_id,
      (SELECT count(*) FROM applications ap JOIN jobs j ON j.id = ap.job_id WHERE j.employer_id = ur.user_id AND ap.created_at >= v_from)::numeric AS a,
      (SELECT count(*) FROM jobs j WHERE j.employer_id = ur.user_id AND j.created_at >= v_from AND j.is_active) AS b,
      (SELECT COALESCE(sum(j.views), 0) FROM jobs j WHERE j.employer_id = ur.user_id AND j.is_active)::bigint AS c
    FROM user_roles ur WHERE ur.role = 'employer'
  ), drivers AS (
    SELECT ur.user_id,
      (SELECT count(*) FROM delivery_requests d WHERE d.driver_id = ur.user_id AND d.status = 'delivered' AND d.delivered_at >= v_from)::numeric AS a,
      (SELECT count(*) FROM delivery_requests d WHERE d.driver_id = ur.user_id AND d.status IN ('accepted','picked_up','delivered') AND d.created_at >= v_from) AS b,
      0::bigint AS c
    FROM user_roles ur WHERE ur.role = 'driver'
  ), scored AS (
    SELECT 'seller' AS r, s.*, CASE WHEN s.a > 0 THEN replace(to_char(round(s.a), 'FM999,999,999,999'), ',', ' ') || ' FCFA de ventes' WHEN s.b > 0 THEN s.b || ' nouvel(s) article(s)' ELSE s.c || ' vue(s)' END AS lbl FROM sellers s WHERE s.a + s.b + s.c > 0
    UNION ALL SELECT 'provider', s.*, CASE WHEN s.a > 0 THEN replace(to_char(round(s.a), 'FM999,999,999,999'), ',', ' ') || ' FCFA de prestations' WHEN s.b > 0 THEN s.b || ' nouveau(x) service(s)' ELSE s.c || ' demande(s) reçue(s)' END FROM providers s WHERE s.a + s.b + s.c > 0
    UNION ALL SELECT 'freelance', s.*, CASE WHEN s.a > 0 THEN s.a || ' embauche(s)' WHEN s.b > 0 THEN s.b || ' présélection(s)' ELSE s.c || ' candidature(s)' END FROM freelances s WHERE s.a + s.b + s.c > 0
    UNION ALL SELECT 'employer', s.*, CASE WHEN s.a > 0 THEN s.a || ' candidature(s) reçue(s)' WHEN s.b > 0 THEN s.b || ' offre(s) publiée(s)' ELSE s.c || ' vue(s) des offres' END FROM recruiters s WHERE s.a + s.b + s.c > 0
    UNION ALL SELECT 'driver', s.*, CASE WHEN s.a > 0 THEN s.a || ' livraison(s)' ELSE s.b || ' course(s) acceptée(s)' END FROM drivers s WHERE s.a + s.b > 0
  ), ranked AS (
    SELECT sc.r, sc.user_id, sc.lbl, row_number() OVER (PARTITION BY sc.r ORDER BY sc.a DESC, sc.b DESC, sc.c DESC) AS rn FROM scored sc
  )
  SELECT rk.r, rk.rn::int, rk.user_id,
    CASE WHEN public.has_role(rk.user_id, 'admin') THEN 'MIYASHI Officiel' ELSE COALESCE(sh.name, NULLIF(pp.username, ''), pp.full_name, 'Membre MIYASHI') END,
    COALESCE(sh.logo_url, pp.avatar_url), rk.lbl
  FROM ranked rk
  LEFT JOIN profiles pp ON pp.user_id = rk.user_id
  LEFT JOIN shops sh ON sh.owner_id = rk.user_id AND rk.r = 'seller'
  WHERE rk.rn <= 3
  ORDER BY rk.r, rk.rn;
END $$;
GRANT EXECUTE ON FUNCTION public.get_rankings(text) TO anon, authenticated;
