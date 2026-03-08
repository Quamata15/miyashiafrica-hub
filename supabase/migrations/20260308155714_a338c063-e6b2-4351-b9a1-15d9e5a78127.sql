
-- Fix security definer views by setting them to security invoker
ALTER VIEW public.driver_profiles_public SET (security_invoker = on);
ALTER VIEW public.freelance_profiles_public SET (security_invoker = on);
