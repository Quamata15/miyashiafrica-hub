// Buying without an account: a guest session (anonymous sign-in) is opened the first time a
// visitor adds to the cart or checks out. Adding an e-mail and password later keeps everything.
import { supabase } from "@/integrations/supabase/client";

export async function ensureGuestSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return data.user?.id ?? null;
}

export const isGuestUser = (u: { is_anonymous?: boolean } | null | undefined) => !!u?.is_anonymous;
