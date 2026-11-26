-- Assign the role picked at sign-up (stored in user metadata). Admin can never be self-assigned.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text := NEW.raw_user_meta_data ->> 'role';
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'), NEW.phone)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  IF v_role IN ('seller', 'provider', 'freelance', 'employer', 'driver') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
