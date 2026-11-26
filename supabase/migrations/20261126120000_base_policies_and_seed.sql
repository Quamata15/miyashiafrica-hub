-- Policies for the base tables recreated in 20260101000000_base_schema.sql,
-- public read views, and seed categories.

-- profiles
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public views expose only non-sensitive columns (no phone, no CV, no alert prefs).
-- They run with the view owner's rights so that anyone can see public profile data
-- while the base tables stay private to their owner.
ALTER VIEW public.profiles_public SET (security_invoker = off, security_barrier = on);
ALTER VIEW public.freelance_profiles_public SET (security_invoker = off, security_barrier = on);
GRANT SELECT ON public.profiles_public, public.freelance_profiles_public TO anon, authenticated;

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categories
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products
CREATE POLICY "Sellers view own products" ON public.products
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers create own products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own products" ON public.products
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own products" ON public.products
  FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- services
CREATE POLICY "Providers view own services" ON public.services
  FOR SELECT TO authenticated USING (auth.uid() = provider_id);
CREATE POLICY "Providers create own services" ON public.services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Providers update own services" ON public.services
  FOR UPDATE TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Providers delete own services" ON public.services
  FOR DELETE TO authenticated USING (auth.uid() = provider_id);
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- jobs
CREATE POLICY "Employers view own jobs" ON public.jobs
  FOR SELECT TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "Employers create own jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers delete own jobs" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "Admins manage jobs" ON public.jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- applications
CREATE POLICY "Freelancers apply to active jobs" ON public.applications
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = freelance_id
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.is_active AND j.employer_id <> auth.uid())
  );
CREATE POLICY "Freelancers update own applications" ON public.applications
  FOR UPDATE TO authenticated USING (auth.uid() = freelance_id) WITH CHECK (auth.uid() = freelance_id);
CREATE POLICY "Freelancers withdraw own applications" ON public.applications
  FOR DELETE TO authenticated USING (auth.uid() = freelance_id);
CREATE POLICY "Employers update applications to their jobs" ON public.applications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid())
  );

-- freelance_profiles
CREATE POLICY "Freelancers manage own profile" ON public.freelance_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view freelance profiles" ON public.freelance_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- analytics_events
CREATE POLICY "Anyone can log own events" ON public.analytics_events
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins read analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed categories
INSERT INTO public.categories (name, slug, type, icon) VALUES
  ('Mode & Textile', 'mode-textile', 'product', 'Shirt'),
  ('Alimentation', 'alimentation', 'product', 'Apple'),
  ('Électronique', 'electronique', 'product', 'Smartphone'),
  ('Maison & Déco', 'maison-deco', 'product', 'Home'),
  ('Beauté & Santé', 'beaute-sante', 'product', 'Sparkles'),
  ('Artisanat', 'artisanat', 'product', 'Palette'),
  ('Agriculture', 'agriculture', 'product', 'Sprout'),
  ('Véhicules & Pièces', 'vehicules', 'product', 'Car'),
  ('Réparation & Dépannage', 'reparation', 'service', 'Wrench'),
  ('Ménage & Entretien', 'menage', 'service', 'Brush'),
  ('Événementiel', 'evenementiel', 'service', 'PartyPopper'),
  ('Cours & Formation', 'formation', 'service', 'GraduationCap'),
  ('Transport & Livraison', 'transport', 'service', 'Truck'),
  ('Beauté & Coiffure', 'coiffure', 'service', 'Scissors'),
  ('Développement web & mobile', 'dev', 'job', 'Code'),
  ('Design & Graphisme', 'design', 'job', 'PenTool'),
  ('Marketing digital', 'marketing', 'job', 'Megaphone'),
  ('Rédaction & Traduction', 'redaction', 'job', 'FileText'),
  ('Comptabilité & Finance', 'finance', 'job', 'Calculator'),
  ('Assistance virtuelle', 'assistance', 'job', 'Headphones')
ON CONFLICT (slug) DO NOTHING;
