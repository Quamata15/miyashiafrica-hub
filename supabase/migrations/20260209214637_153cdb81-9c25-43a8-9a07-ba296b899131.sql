
-- =============================================
-- 1. STORAGE BUCKETS for product media and KYC docs
-- =============================================

-- Product media bucket (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-media', 'product-media', true, 52428800, 
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']);

-- KYC documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']);

-- Profile avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']);

-- Freelance portfolios bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolios', 'portfolios', true, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4']);

-- Storage policies for product-media
CREATE POLICY "Anyone can view product media" ON storage.objects FOR SELECT USING (bucket_id = 'product-media');
CREATE POLICY "Authenticated users can upload product media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own product media" ON storage.objects FOR UPDATE USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own product media" ON storage.objects FOR DELETE USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for kyc-documents
CREATE POLICY "Users can view own KYC docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload KYC docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for portfolios
CREATE POLICY "Anyone can view portfolios" ON storage.objects FOR SELECT USING (bucket_id = 'portfolios');
CREATE POLICY "Users can upload own portfolio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own portfolio" ON storage.objects FOR DELETE USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- 2. PROMOTIONS & BOOSTING SYSTEM
-- =============================================

CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product', 'service', 'profile', 'freelance')),
  target_id UUID,
  name TEXT NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'quantity_based', 'seasonal')),
  discount_value NUMERIC DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_tag TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own promotions" ON public.promotions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active promotions visible to all" ON public.promotions FOR SELECT USING (is_active = true AND end_date > now());

CREATE TABLE public.boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('product', 'service', 'profile', 'freelance')),
  target_id UUID,
  zone_radius_km INTEGER NOT NULL DEFAULT 50,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  price_paid NUMERIC NOT NULL CHECK (price_paid >= 2500 AND price_paid <= 25000),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own boosts" ON public.boosts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active boosts visible to all" ON public.boosts FOR SELECT USING (is_active = true AND expires_at > now());

-- =============================================
-- 3. KYC VERIFICATION DOCUMENTS
-- =============================================

CREATE TABLE public.kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'identity_card', 'passport', 'drivers_license', 'attestation',
    'diploma', 'municipality_cert', 'nif', 'commerce_card',
    'company_nif', 'tax_invoice', 'other'
  )),
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own KYC docs" ON public.kyc_documents FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 4. UPDATE DELIVERY PRICING - Vehicle types
-- =============================================

-- Update vehicle_type constraint for driver_profiles
ALTER TABLE public.driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_vehicle_type_check;

-- Add vehicle_type pricing function
CREATE OR REPLACE FUNCTION public.calculate_delivery_price(
  p_distance_km NUMERIC, 
  p_is_night BOOLEAN DEFAULT false,
  p_vehicle_type TEXT DEFAULT 'moto'
)
RETURNS TABLE(base_price NUMERIC, commission NUMERIC, surcharge NUMERIC, total NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
  v_base NUMERIC;
  v_commission NUMERIC;
  v_surcharge NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Rate per km by vehicle type
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
  -- Fixed 18% commission on base price
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

-- =============================================
-- 5. FREELANCE PROFILE ENHANCEMENTS
-- =============================================

ALTER TABLE public.freelance_profiles 
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alert_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS realizations JSONB DEFAULT '[]';

-- =============================================
-- 6. PAYMENTS TABLE
-- =============================================

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  escrow_id UUID REFERENCES public.escrow_transactions(id),
  payer_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'orange_money', 'wave', 'tmoney', 'wallet')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  provider_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = payer_id);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- =============================================
-- 7. FAQ / SUPPORT TABLES
-- =============================================

CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ viewable by everyone" ON public.faq_items FOR SELECT USING (is_active = true);

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 8. ADD 'provider' role enum value if not exists + provider dashboard
-- =============================================

-- Add delivery_requests vehicle_type column
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'moto';

-- Enable realtime for delivery tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;

-- Insert default FAQ items
INSERT INTO public.faq_items (category, question, answer, sort_order) VALUES
('general', 'Comment créer un compte ?', 'Cliquez sur "S''inscrire" et remplissez le formulaire avec vos informations. Vous recevrez un email de confirmation.', 1),
('general', 'Comment fonctionne le paiement ?', 'Les paiements sont sécurisés via notre système d''escrow. L''argent est bloqué jusqu''à la validation de la réception par l''acheteur.', 2),
('livraison', 'Comment sont calculés les frais de livraison ?', 'Les frais dépendent de la distance et du type de véhicule : Moto (550F/km), Tricycle (1000F/km), Voiture (1500F/km), Camionnette (2000F/km).', 3),
('livraison', 'Puis-je choisir mon livreur ?', 'Oui ! Vous pouvez sélectionner un livreur disponible dans votre zone en fonction de ses notes et badges.', 4),
('vendeur', 'Comment vendre sur la plateforme ?', 'Créez un compte vendeur, ajoutez vos produits avec photos et descriptions, et commencez à recevoir des commandes.', 5),
('freelance', 'Comment devenir freelance ?', 'Inscrivez-vous en tant que freelance, complétez votre profil avec vos compétences, CV et portfolio.', 6),
('paiement', 'Quels moyens de paiement sont acceptés ?', 'Nous acceptons les cartes bancaires, Orange Money, Wave et TMoney.', 7),
('securite', 'Comment fonctionne la vérification KYC ?', 'Soumettez au moins 2 pièces d''identité pour vérifier votre compte. Cela renforce la confiance des utilisateurs.', 8);
