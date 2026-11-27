-- Buying without an account: a guest gets an anonymous session (Supabase anonymous sign-in),
-- so the cart, the order, the payment in escrow and the handover code work as for everyone.
-- A guest keeps the Buyer space only; opening any professional space needs a real account
-- (adding an e-mail and password turns the guest into that account and keeps the orders).
CREATE OR REPLACE FUNCTION public.is_guest(p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE((SELECT u.is_anonymous FROM auth.users u WHERE u.id = p_user), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_guest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guest(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_guest_roles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NEW.role <> 'buyer' AND public.is_guest(NEW.user_id) THEN
    RAISE EXCEPTION 'Créez votre compte (e-mail et mot de passe) pour ouvrir cet espace : vos commandes sont conservées';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_guest_roles ON public.user_roles;
CREATE TRIGGER guard_guest_roles BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_guest_roles();

-- Guests cannot publish listings either (belt and braces: those need a space anyway).
CREATE OR REPLACE FUNCTION public.guard_guest_publish() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND public.is_guest(auth.uid()) THEN
    RAISE EXCEPTION 'Créez votre compte pour publier';
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','services','jobs','reviews','news_posts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_guest_publish ON public.%I', t);
    EXECUTE format('CREATE TRIGGER guard_guest_publish BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_guest_publish()', t);
  END LOOP;
END $$;
