-- Admin helper: find an account id by e-mail (to link a pickup-point partner).
CREATE OR REPLACE FUNCTION public.admin_find_user(p_email text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN (SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_find_user(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_find_user(text) TO authenticated;

-- Admin: risky accounts with their names.
CREATE OR REPLACE FUNCTION public.admin_risk_list(p_min int DEFAULT 30)
RETURNS TABLE (user_id uuid, full_name text, email text, score int, signals jsonb, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT r.user_id, p.full_name, u.email::text, r.score, r.signals, r.updated_at
    FROM user_risk_scores r LEFT JOIN profiles p ON p.user_id = r.user_id LEFT JOIN auth.users u ON u.id = r.user_id
    WHERE r.score >= p_min ORDER BY r.score DESC LIMIT 200;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_risk_list(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_risk_list(int) TO authenticated;

-- Admin: signed download link for a backup file.
CREATE POLICY "Admins list status checks" ON public.status_checks FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));
