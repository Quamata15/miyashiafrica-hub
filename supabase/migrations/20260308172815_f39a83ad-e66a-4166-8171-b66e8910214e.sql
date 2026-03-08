
-- Add creative media and target name to boosts
ALTER TABLE public.boosts ADD COLUMN IF NOT EXISTS creative_url text;
ALTER TABLE public.boosts ADD COLUMN IF NOT EXISTS creative_type text DEFAULT 'none';
ALTER TABLE public.boosts ADD COLUMN IF NOT EXISTS target_name text;
ALTER TABLE public.boosts ADD COLUMN IF NOT EXISTS description text;

-- Add target_audience details to campaigns  
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS objective text DEFAULT 'visibility';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS boosts_count integer DEFAULT 0;
