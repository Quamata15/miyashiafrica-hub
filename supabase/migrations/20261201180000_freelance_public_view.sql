-- The public freelance list read the private table (only the owner and the admin could see rows),
-- so visitors saw no freelance at all. The public view now carries what the list needs; private
-- fields (CV, alerts, interests) stay out.
CREATE OR REPLACE VIEW public.freelance_profiles_public AS
SELECT id, user_id, title, skills, bio, photo_url, hourly_rate, experience_years, availability, portfolio_urls,
  realizations, social_links, created_at, updated_at,
  location, languages, contract_types, open_to_work, is_featured
FROM public.freelance_profiles
WHERE public.has_role(user_id, 'freelance') OR public.has_role(user_id, 'admin');
GRANT SELECT ON public.freelance_profiles_public TO anon, authenticated;
