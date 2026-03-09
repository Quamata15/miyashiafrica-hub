
-- Fix analytics_events INSERT policy: require authentication instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);
