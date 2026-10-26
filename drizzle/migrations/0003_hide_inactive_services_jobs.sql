DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Active services are public" ON public.services FOR SELECT USING (is_active = true OR auth.uid() = provider_id);
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Active jobs are public" ON public.jobs FOR SELECT USING (is_active = true OR auth.uid() = employer_id);