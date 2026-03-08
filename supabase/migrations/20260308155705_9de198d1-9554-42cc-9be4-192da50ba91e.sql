
-- LOT 4: Security fixes

-- 1. Fix reviews policy: split UPDATE so reviewed_user can only update 'response'
DROP POLICY IF EXISTS "Users can update their reviews" ON public.reviews;

CREATE POLICY "Reviewers can update own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewed users can respond to reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewed_user_id)
WITH CHECK (
  auth.uid() = reviewed_user_id
  AND rating = (SELECT r.rating FROM public.reviews r WHERE r.id = reviews.id)
  AND comment = (SELECT r.comment FROM public.reviews r WHERE r.id = reviews.id)
  AND reviewer_id = (SELECT r.reviewer_id FROM public.reviews r WHERE r.id = reviews.id)
);

-- 2. Restrict driver_profiles: create a public view without sensitive fields
CREATE OR REPLACE VIEW public.driver_profiles_public AS
SELECT 
  id, user_id, zone, vehicle_type, is_available,
  average_rating, badge, total_deliveries, loyalty_points,
  created_at, updated_at
FROM public.driver_profiles;

-- 3. Restrict boosts: change public policy to authenticated only
DROP POLICY IF EXISTS "Active boosts visible to all" ON public.boosts;
CREATE POLICY "Active boosts visible to authenticated"
ON public.boosts
FOR SELECT
TO authenticated
USING (is_active = true AND expires_at > now());

-- 4. Restrict freelance_profiles public view
CREATE OR REPLACE VIEW public.freelance_profiles_public AS
SELECT 
  id, user_id, title, skills, bio, photo_url,
  hourly_rate, experience_years, availability,
  portfolio_urls, realizations, social_links,
  created_at, updated_at
FROM public.freelance_profiles;
