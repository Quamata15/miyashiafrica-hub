-- Trigger and helper functions added today are not meant to be called through the API.
-- (Triggers still fire: firing a trigger does not check EXECUTE.)
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.guard_guest_roles()', 'public.guard_guest_publish()', 'public.guard_message_contacts()', 'public.guard_listing_contacts()',
    'public.kyc_sync_verified()', 'public.guard_kyc_insert()', 'public.guard_featured()', 'public.guard_delivery_driver()',
    'public.expire_featured()', 'public.expire_savings_plans()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;
