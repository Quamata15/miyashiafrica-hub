
-- Campaigns table for grouping boosts into campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  budget_total NUMERIC NOT NULL DEFAULT 0,
  budget_spent NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_audience JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Boost metrics table for tracking performance
CREATE TABLE public.boost_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boost_id UUID REFERENCES public.boosts(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue_generated NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(boost_id, date)
);

-- Add campaign_id to boosts
ALTER TABLE public.boosts ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- RLS for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaigns"
  ON public.campaigns FOR ALL
  USING (auth.uid() = user_id);

-- RLS for boost_metrics
ALTER TABLE public.boost_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boost metrics"
  ON public.boost_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boosts b
      WHERE b.id = boost_metrics.boost_id AND b.user_id = auth.uid()
    )
  );

-- Function to increment boost views (called when a boosted item is displayed)
CREATE OR REPLACE FUNCTION public.increment_boost_metric(
  p_boost_id UUID,
  p_metric TEXT DEFAULT 'views'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO boost_metrics (boost_id, date)
  VALUES (p_boost_id, CURRENT_DATE)
  ON CONFLICT (boost_id, date) DO NOTHING;

  IF p_metric = 'views' THEN
    UPDATE boost_metrics SET views = views + 1
    WHERE boost_id = p_boost_id AND date = CURRENT_DATE;
  ELSIF p_metric = 'clicks' THEN
    UPDATE boost_metrics SET clicks = clicks + 1
    WHERE boost_id = p_boost_id AND date = CURRENT_DATE;
  ELSIF p_metric = 'conversions' THEN
    UPDATE boost_metrics SET conversions = conversions + 1
    WHERE boost_id = p_boost_id AND date = CURRENT_DATE;
  END IF;
END;
$$;
