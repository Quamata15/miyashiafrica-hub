-- Daily cap on AI calls per user (cost protection).
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;   -- service role only
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON public.ai_usage(user_id, created_at DESC);
SELECT cron.schedule('miyashi-ai-usage-cleanup', '37 4 * * *', $$DELETE FROM public.ai_usage WHERE created_at < now() - interval '7 days'$$);
