
-- Recreate profiles_public view with username and location
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  full_name,
  username,
  avatar_url,
  bio,
  is_verified,
  location,
  created_at
FROM public.profiles;
