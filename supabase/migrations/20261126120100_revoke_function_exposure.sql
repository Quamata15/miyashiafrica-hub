-- Signed-out visitors may only call the public search functions.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP
    IF f.proname NOT IN ('search_products', 'search_services') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    END IF;
  END LOOP;
END $$;

-- Trigger functions are never called through the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_product() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_driver_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_delivery_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points_on_order_complete() FROM authenticated;
