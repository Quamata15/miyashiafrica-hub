-- The space checks run inside database functions and triggers (as their owner); the app never
-- calls them directly, so signed-in users do not need to execute them.
REVOKE EXECUTE ON FUNCTION public.require_space(public.app_role[]), public.space_ok(uuid, public.app_role[]), public.check_boost_target(text, uuid)
  FROM PUBLIC, anon, authenticated;
