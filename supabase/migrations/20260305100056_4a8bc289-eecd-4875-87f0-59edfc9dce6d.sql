
-- Fix 1: Change calculate_delivery_price to SECURITY INVOKER with input validation
CREATE OR REPLACE FUNCTION public.calculate_delivery_price(
  p_distance_km NUMERIC, 
  p_is_night BOOLEAN DEFAULT false,
  p_vehicle_type TEXT DEFAULT 'moto'
)
RETURNS TABLE(base_price NUMERIC, commission NUMERIC, surcharge NUMERIC, total NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
  v_base NUMERIC;
  v_commission NUMERIC;
  v_surcharge NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Input validation
  IF p_distance_km < 0 OR p_distance_km > 10000 THEN
    RAISE EXCEPTION 'Invalid distance: must be between 0 and 10000 km';
  END IF;
  IF p_vehicle_type NOT IN ('moto', 'tricycle', 'voiture', 'camionnette', 'avion', 'bateau') THEN
    RAISE EXCEPTION 'Invalid vehicle type: %', p_vehicle_type;
  END IF;

  v_rate := CASE p_vehicle_type
    WHEN 'moto' THEN 550
    WHEN 'tricycle' THEN 1000
    WHEN 'voiture' THEN 1500
    WHEN 'camionnette' THEN 2000
    WHEN 'avion' THEN 5000
    WHEN 'bateau' THEN 3000
    ELSE 550
  END;
  
  v_base := p_distance_km * v_rate;
  v_commission := v_base * 0.18;
  
  IF p_is_night THEN
    v_surcharge := v_base * 0.25;
  ELSE
    v_surcharge := 0;
  END IF;
  
  v_total := v_base + v_surcharge;
  
  RETURN QUERY SELECT v_base, v_commission, v_surcharge, v_total;
END;
$$;

-- Also fix the simpler overload
CREATE OR REPLACE FUNCTION public.calculate_delivery_price(
  p_distance_km NUMERIC, 
  p_is_night BOOLEAN DEFAULT false
)
RETURNS TABLE(base_price NUMERIC, commission NUMERIC, surcharge NUMERIC, total NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_base NUMERIC;
  v_commission NUMERIC;
  v_surcharge NUMERIC;
  v_total NUMERIC;
BEGIN
  IF p_distance_km < 0 OR p_distance_km > 10000 THEN
    RAISE EXCEPTION 'Invalid distance: must be between 0 and 10000 km';
  END IF;

  v_base := p_distance_km * 550;
  v_commission := p_distance_km * 100;
  
  IF p_is_night THEN
    v_surcharge := (v_base + v_commission) * 0.25;
  ELSE
    v_surcharge := 0;
  END IF;
  
  v_total := v_base - v_commission + v_surcharge;
  
  RETURN QUERY SELECT v_base, v_commission, v_surcharge, v_total;
END;
$$;

-- Fix 2: Add admin storage policy for kyc-documents bucket
CREATE POLICY "Admins can view all KYC storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix 3: Fix notification spam - restrict INSERT policy and create server-side function
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Only allow users to create notifications for themselves (self-notifications)
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create a SECURITY DEFINER function for cross-user notifications (system use)
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  IF length(p_title) > 200 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;
  IF length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data);
END;
$$;

-- Create triggers for automatic notifications on key events
CREATE OR REPLACE FUNCTION public.notify_on_delivery_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.driver_id,
      'delivery_request',
      'Nouvelle demande de livraison 🚚',
      'Vous avez reçu une nouvelle demande de livraison',
      jsonb_build_object('delivery_id', NEW.id, 'order_id', NEW.order_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_notification_trigger
  AFTER INSERT ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_delivery_request();
