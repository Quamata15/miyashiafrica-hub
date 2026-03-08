
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  seller_id UUID NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own promo codes
CREATE POLICY "Sellers can manage own promo codes"
  ON public.promo_codes FOR ALL
  USING (auth.uid() = seller_id);

-- Anyone can read active promo codes (needed for validation at checkout)
CREATE POLICY "Active promo codes readable by all authenticated"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now() AND (max_uses IS NULL OR used_count < max_uses));
