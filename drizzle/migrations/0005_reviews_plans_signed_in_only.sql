DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;
CREATE POLICY "Signed-in users can view reviews" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Plans viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Signed-in users can view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);