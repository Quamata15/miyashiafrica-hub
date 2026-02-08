
-- Add 'driver' role to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Driver profiles table
CREATE TABLE public.driver_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  zone TEXT NOT NULL DEFAULT 'Lomé',
  vehicle_type TEXT NOT NULL DEFAULT 'moto',
  license_number TEXT,
  is_available BOOLEAN DEFAULT true,
  loyalty_points INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  badge TEXT DEFAULT 'bronze',
  commission_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver profiles viewable by everyone"
  ON public.driver_profiles FOR SELECT USING (true);

CREATE POLICY "Drivers can insert own profile"
  ON public.driver_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile"
  ON public.driver_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Delivery requests table (escrow-based)
CREATE TABLE public.delivery_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  driver_id UUID,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_price NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  night_surcharge BOOLEAN DEFAULT false,
  surcharge_amount NUMERIC DEFAULT 0,
  total_delivery_price NUMERIC NOT NULL DEFAULT 0,
  pickup_location JSONB,
  delivery_location JSONB,
  pickup_address TEXT,
  delivery_address TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their delivery requests"
  ON public.delivery_requests FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR auth.uid() = driver_id);

CREATE POLICY "Buyers can create delivery requests"
  ON public.delivery_requests FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update delivery requests"
  ON public.delivery_requests FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR auth.uid() = driver_id);

-- Drivers can see pending requests in their zone
CREATE POLICY "Drivers can view pending requests"
  ON public.delivery_requests FOR SELECT
  USING (status = 'pending' AND EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.user_id = auth.uid() AND dp.is_available = true
  ));

-- Driver ratings table
CREATE TABLE public.driver_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES public.delivery_requests(id) NOT NULL,
  driver_id UUID NOT NULL,
  rated_by UUID NOT NULL,
  product_condition INTEGER NOT NULL CHECK (product_condition >= 1 AND product_condition <= 5),
  delivery_time INTEGER NOT NULL CHECK (delivery_time >= 1 AND delivery_time <= 5),
  politeness INTEGER NOT NULL CHECK (politeness >= 1 AND politeness <= 5),
  overall_score NUMERIC(3,2) GENERATED ALWAYS AS (
    (product_condition + delivery_time + politeness)::NUMERIC / 3
  ) STORED,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings viewable by everyone"
  ON public.driver_ratings FOR SELECT USING (true);

CREATE POLICY "Buyers can rate drivers"
  ON public.driver_ratings FOR INSERT
  WITH CHECK (auth.uid() = rated_by);

-- Subscription plans for service providers
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  annual_price NUMERIC NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable by everyone"
  ON public.subscription_plans FOR SELECT USING (true);

-- User subscriptions
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  company_size TEXT,
  company_name TEXT,
  location_type TEXT DEFAULT 'urban',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Escrow/wallet transactions
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  delivery_id UUID REFERENCES public.delivery_requests(id),
  payer_id UUID NOT NULL,
  seller_amount NUMERIC DEFAULT 0,
  driver_amount NUMERIC DEFAULT 0,
  platform_commission NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (auth.uid() = payer_id OR auth.uid() IN (
    SELECT seller_id FROM public.orders WHERE orders.id = escrow_transactions.order_id
  ) OR auth.uid() IN (
    SELECT driver_id FROM public.delivery_requests WHERE delivery_requests.id = escrow_transactions.delivery_id
  ));

CREATE POLICY "System can create escrow transactions"
  ON public.escrow_transactions FOR INSERT
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Participants can update escrow"
  ON public.escrow_transactions FOR UPDATE
  USING (auth.uid() = payer_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, tier, annual_price, features) VALUES
  ('Petite Entreprise', 'small', 10000, '["Profil vendeur", "5 services", "Support email"]'::jsonb),
  ('Moyenne Entreprise', 'medium', 20000, '["Profil premium", "20 services", "Support prioritaire", "Analytics"]'::jsonb),
  ('Grande Entreprise', 'large', 35000, '["Profil vedette", "Services illimités", "Support dédié", "Analytics avancé", "Badge vérifié"]'::jsonb);

-- Function to calculate delivery price
CREATE OR REPLACE FUNCTION public.calculate_delivery_price(
  p_distance_km NUMERIC,
  p_is_night BOOLEAN DEFAULT false
)
RETURNS TABLE(base_price NUMERIC, commission NUMERIC, surcharge NUMERIC, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base NUMERIC;
  v_commission NUMERIC;
  v_surcharge NUMERIC;
  v_total NUMERIC;
BEGIN
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

-- Trigger to update driver stats after rating
CREATE OR REPLACE FUNCTION public.update_driver_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.driver_profiles
  SET 
    average_rating = (
      SELECT COALESCE(AVG(overall_score), 0)
      FROM public.driver_ratings
      WHERE driver_id = NEW.driver_id
    ),
    loyalty_points = loyalty_points + 10,
    badge = CASE
      WHEN loyalty_points + 10 >= 500 THEN 'gold'
      WHEN loyalty_points + 10 >= 200 THEN 'silver'
      ELSE 'bronze'
    END
  WHERE user_id = NEW.driver_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_driver_stats_trigger
  AFTER INSERT ON public.driver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_stats();

-- Update timestamp triggers
CREATE TRIGGER update_driver_profiles_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_requests_updated_at
  BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
