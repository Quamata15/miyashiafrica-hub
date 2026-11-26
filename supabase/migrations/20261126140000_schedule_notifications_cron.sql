-- Daily favourite-promo alerts and weekly summaries, run by pg_cron through the
-- notifications-cron edge function. The shared secret lives in Supabase Vault.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notifications_cron_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'notifications_cron_secret', 'Auth for the notifications-cron edge function');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_cron_secret(p_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notifications_cron_secret' AND decrypted_secret = p_secret)
$$;
REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.call_notifications_cron(p_action text)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT net.http_post(
    url := 'https://decycxufopbagjdpejul.supabase.co/functions/v1/notifications-cron',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_cron_secret')),
    body := jsonb_build_object('action', p_action),
    timeout_milliseconds := 30000)
$$;
REVOKE EXECUTE ON FUNCTION public.call_notifications_cron(text) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('miyashi-price-drops', '17 9 * * *', $$SELECT public.call_notifications_cron('check_price_drops')$$);
SELECT cron.schedule('miyashi-weekly-summary', '23 8 * * 1', $$SELECT public.call_notifications_cron('weekly_summary')$$);
