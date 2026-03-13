
-- Create a SECURITY DEFINER function for self-assigning non-admin roles during onboarding
CREATE OR REPLACE FUNCTION public.assign_own_role(p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Only allow non-admin roles
  IF p_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  -- Insert role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
