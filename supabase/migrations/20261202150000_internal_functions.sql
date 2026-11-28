-- call_internal_function: the newsletter confirmation was not in the allowed list, so every
-- subscription failed ("Unknown function newsletter"). The project URL now comes from the
-- vault secret project_url when it exists (test project), and defaults to production.
CREATE OR REPLACE FUNCTION public.call_internal_function(p_fn text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  IF p_fn NOT IN ('notifications-cron','notify-dispatch','embed','moderate','health','backup-export','newsletter') THEN
    RAISE EXCEPTION 'Unknown function %', p_fn;
  END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  RETURN net.http_post(
    url := rtrim(COALESCE(v_url, 'https://decycxufopbagjdpejul.supabase.co'), '/') || '/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_cron_secret')),
    body := p_body, timeout_milliseconds := 30000);
END $$;
REVOKE EXECUTE ON FUNCTION public.call_internal_function(text, jsonb) FROM PUBLIC, anon, authenticated;
