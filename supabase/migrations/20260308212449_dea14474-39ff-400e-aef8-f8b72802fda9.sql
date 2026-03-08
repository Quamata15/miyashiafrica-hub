
-- 1. Fix award_loyalty_points: restrict to admin or trigger context only
CREATE OR REPLACE FUNCTION public.award_loyalty_points(p_user_id uuid, p_points integer, p_type text, p_description text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_total INTEGER;
  v_new_level TEXT;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Authorization: only allow admins or trigger context (where auth.uid() is null)
  IF v_caller_id IS NOT NULL AND NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only system triggers or admins can award points';
  END IF;

  -- Upsert loyalty record
  INSERT INTO loyalty_points (user_id, points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    points = loyalty_points.points + p_points,
    total_earned = loyalty_points.total_earned + p_points,
    updated_at = now();

  -- Get new total
  SELECT total_earned INTO v_new_total FROM loyalty_points WHERE user_id = p_user_id;

  -- Compute level
  v_new_level := CASE
    WHEN v_new_total >= 10000 THEN 'platinum'
    WHEN v_new_total >= 5000 THEN 'gold'
    WHEN v_new_total >= 2000 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE loyalty_points SET level = v_new_level WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO loyalty_transactions (user_id, points, type, description, reference_id)
  VALUES (p_user_id, p_points, p_type, p_description, p_reference_id);
END;
$function$;

-- 2. Fix chat-attachments storage SELECT policy: restrict to folder-based ownership
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view chat attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Fix driver_profiles UPDATE policy: add WITH CHECK to prevent stat self-inflation
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.driver_profiles;
CREATE POLICY "Drivers can update own profile"
  ON public.driver_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND loyalty_points = (SELECT dp.loyalty_points FROM driver_profiles dp WHERE dp.user_id = auth.uid())
    AND average_rating = (SELECT dp.average_rating FROM driver_profiles dp WHERE dp.user_id = auth.uid())
    AND commission_balance = (SELECT dp.commission_balance FROM driver_profiles dp WHERE dp.user_id = auth.uid())
    AND badge = (SELECT dp.badge FROM driver_profiles dp WHERE dp.user_id = auth.uid())
    AND total_deliveries = (SELECT dp.total_deliveries FROM driver_profiles dp WHERE dp.user_id = auth.uid())
  );
