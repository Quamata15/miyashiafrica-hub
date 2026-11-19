DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;
CREATE POLICY "Users can insert own empty wallet" ON public.wallets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND balance = 0 AND total_earned = 0 AND total_withdrawn = 0);

DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Buyers can create unpaid orders" ON public.orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id AND COALESCE(payment_status, 'pending') = 'pending');

DROP POLICY IF EXISTS "Drivers can insert own profile" ON public.driver_profiles;
CREATE POLICY "Drivers can insert own fresh profile" ON public.driver_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(loyalty_points,0) = 0 AND COALESCE(total_deliveries,0) = 0
  AND COALESCE(average_rating,0) = 0 AND COALESCE(commission_balance,0) = 0 AND badge IS NULL);