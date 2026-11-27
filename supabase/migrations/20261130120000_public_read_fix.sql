-- Visitors (not signed in) could not read banners or legal documents: the public read rules also
-- asked "is the reader an admin?" through has_role, which visitors may not call, so the whole
-- query failed. The admin check now goes through is_admin(), which only answers for the caller.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "Live banners are public" ON public.site_banners;
CREATE POLICY "Live banners are public" ON public.site_banners FOR SELECT TO anon, authenticated
  USING ((is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR public.is_admin());

DROP POLICY IF EXISTS "Legal docs are public" ON public.legal_documents;
CREATE POLICY "Legal docs are public" ON public.legal_documents FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

-- Rules that only concern signed-in people.
ALTER POLICY "Admins can manage all disputes" ON public.disputes TO authenticated;
ALTER POLICY "Dispute participants can view events" ON public.dispute_events TO authenticated;
ALTER POLICY "Admins can manage dispute events" ON public.dispute_events TO authenticated;
ALTER POLICY "Admins can manage violations" ON public.vendor_violations TO authenticated;
ALTER POLICY "Admins can manage contracts" ON public.driver_contracts TO authenticated;
