
-- Tighten analytics_events INSERT: user_id must match auth.uid() or be null
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
