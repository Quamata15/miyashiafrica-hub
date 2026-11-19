DROP POLICY IF EXISTS "Signed-in users can view reviews" ON public.reviews;
CREATE POLICY "Reviews visible on active listings or to participants" ON public.reviews FOR SELECT TO authenticated
USING (
  auth.uid() = reviewer_id OR auth.uid() = reviewed_user_id OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = reviews.product_id AND p.is_active AND p.deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = reviews.service_id AND s.is_active)
);

DROP POLICY IF EXISTS "Signed-in users can view plans" ON public.subscription_plans;
CREATE POLICY "Signed-in users can view active plans" ON public.subscription_plans FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Ratings viewable by everyone" ON public.driver_ratings;
CREATE POLICY "Ratings visible to driver, rater and admins" ON public.driver_ratings FOR SELECT TO authenticated
USING (auth.uid() = driver_id OR auth.uid() = rated_by OR public.has_role(auth.uid(),'admin'));