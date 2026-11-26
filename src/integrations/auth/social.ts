// Social sign-in through Supabase Auth.
// Enable the Google / Apple providers in Supabase → Authentication → Providers,
// and add the site URL to Authentication → URL Configuration → Redirect URLs.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const socialAuth = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams: opts?.extraParams,
        },
      });
      return { error, redirected: !error };
    },
  },
};
