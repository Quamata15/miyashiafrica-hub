
-- Analytics events table for tracking user interactions
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_label TEXT,
  event_value NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for querying by event name and date
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (including anonymous visitors)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own events
CREATE POLICY "Users can read own events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
