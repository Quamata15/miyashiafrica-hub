-- Profiles, banners and sponsored visuals.
--  * A user edits their name, username, photo and bio, but never their "verified" badge.
--  * Admin banners get their own image storage (upload from the admin panel).
--  * Visuals bought with a boost are shown to visitors as "Sponsorisé" banners.

-- Profiles: checked fields ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.is_verified END;
    IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Profil non modifiable'; END IF;
  END IF;
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := NULLIF(regexp_replace(trim(NEW.full_name), '\s+', ' ', 'g'), '');
    IF (TG_OP = 'INSERT' OR NEW.full_name IS DISTINCT FROM OLD.full_name) AND NEW.full_name IS NOT NULL AND char_length(NEW.full_name) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'Le nom doit faire entre 2 et 80 caractères';
    END IF;
  END IF;
  IF NEW.username IS NOT NULL THEN
    NEW.username := NULLIF(lower(trim(NEW.username)), '');
    IF (TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username) AND NEW.username IS NOT NULL AND NEW.username !~ '^[a-z0-9][a-z0-9._]{2,29}$' THEN
      RAISE EXCEPTION 'Pseudonyme : 3 à 30 caractères, lettres minuscules, chiffres, point ou tiret bas';
    END IF;
  END IF;
  IF NEW.bio IS NOT NULL AND char_length(NEW.bio) > 1000 THEN RAISE EXCEPTION 'Bio limitée à 1000 caractères'; END IF;
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url !~ '^https://' THEN RAISE EXCEPTION 'Photo invalide'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile ON public.profiles;
CREATE TRIGGER guard_profile BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile();
REVOKE EXECUTE ON FUNCTION public.guard_profile() FROM PUBLIC, anon, authenticated;

-- Shops: name and address in the link stay readable.
CREATE OR REPLACE FUNCTION public.guard_shop() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.name := regexp_replace(trim(COALESCE(NEW.name, '')), '\s+', ' ', 'g');
  IF char_length(NEW.name) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Nom de boutique : entre 2 et 80 caractères'; END IF;
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9](-?[a-z0-9])*$' OR char_length(NEW.slug) NOT BETWEEN 3 AND 60 THEN
    RAISE EXCEPTION 'Adresse de boutique : 3 à 60 caractères, lettres minuscules, chiffres et tirets';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_shop ON public.shops;
CREATE TRIGGER guard_shop BEFORE INSERT OR UPDATE OF name, slug ON public.shops FOR EACH ROW EXECUTE FUNCTION public.guard_shop();

-- Banners: image storage for the admin ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-media', 'site-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Admins upload site media" ON storage.objects;
DROP POLICY IF EXISTS "Admins update site media" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete site media" ON storage.objects;
CREATE POLICY "Admins upload site media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins update site media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins delete site media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role((SELECT auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_banner() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF char_length(trim(COALESCE(NEW.title, ''))) NOT BETWEEN 2 AND 90 THEN RAISE EXCEPTION 'Titre de bannière : entre 2 et 90 caractères'; END IF;
  IF NEW.placement NOT IN ('home_top', 'home_middle', 'marketplace_top', 'services_top', 'freelance_top') THEN RAISE EXCEPTION 'Emplacement inconnu'; END IF;
  IF NEW.image_url IS NOT NULL AND NEW.image_url !~ '^https://' THEN RAISE EXCEPTION 'L''image doit être un lien https'; END IF;
  IF NEW.cta_href IS NOT NULL AND NEW.cta_href !~ '^(/|https://)' THEN RAISE EXCEPTION 'Le lien du bouton doit commencer par / ou https://'; END IF;
  IF NEW.starts_at IS NOT NULL AND NEW.ends_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'La fin doit être après le début'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_banner ON public.site_banners;
CREATE TRIGGER guard_banner BEFORE INSERT OR UPDATE ON public.site_banners FOR EACH ROW EXECUTE FUNCTION public.guard_banner();

-- Sponsored visuals ----------------------------------------------------------------------------------
-- Boost rows hold prices and owners, so visitors read them through this narrow function.
CREATE OR REPLACE FUNCTION public.get_sponsored(p_kind text DEFAULT NULL, p_limit integer DEFAULT 6)
RETURNS TABLE (id uuid, boost_type text, target_id uuid, title text, description text, creative_url text, creative_type text, href text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.boost_type, b.target_id, COALESCE(NULLIF(b.target_name, ''), 'Sponsorisé'), b.description, b.creative_url, b.creative_type,
    CASE b.boost_type WHEN 'product' THEN '/product/' || b.target_id WHEN 'service' THEN '/service/' || b.target_id
      WHEN 'job' THEN '/freelance?onglet=offres' ELSE '/user/' || b.user_id END
  FROM boosts b
  WHERE b.is_active AND b.expires_at > now() AND b.starts_at <= now() AND b.creative_type IN ('image', 'video') AND b.creative_url ~ '^https://'
    AND (p_kind IS NULL OR b.boost_type = p_kind)
    AND CASE b.boost_type
      WHEN 'product' THEN EXISTS (SELECT 1 FROM products p WHERE p.id = b.target_id AND p.is_active AND p.deleted_at IS NULL)
      WHEN 'service' THEN EXISTS (SELECT 1 FROM services s WHERE s.id = b.target_id AND s.is_active)
      WHEN 'job' THEN EXISTS (SELECT 1 FROM jobs j WHERE j.id = b.target_id AND j.is_active)
      ELSE true END
  ORDER BY random()
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12)
$$;
GRANT EXECUTE ON FUNCTION public.get_sponsored(text, integer) TO anon, authenticated;

-- Banners can also be placed on the Services and Freelance pages.
ALTER TABLE public.site_banners DROP CONSTRAINT IF EXISTS site_banners_placement_check;
ALTER TABLE public.site_banners ADD CONSTRAINT site_banners_placement_check
  CHECK (placement IN ('home_top', 'home_middle', 'marketplace_top', 'services_top', 'freelance_top'));
