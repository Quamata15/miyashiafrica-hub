DROP POLICY IF EXISTS "Drivers can insert own fresh profile" ON public.driver_profiles;
CREATE POLICY "Drivers can insert own fresh profile" ON public.driver_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(loyalty_points,0) = 0 AND COALESCE(total_deliveries,0) = 0
  AND COALESCE(average_rating,0) = 0 AND COALESCE(commission_balance,0) = 0 AND COALESCE(badge,'bronze') = 'bronze');