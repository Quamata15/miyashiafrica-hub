import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserPreferences {
  dismissed_seller_onboarding: boolean;
  dismissed_provider_onboarding: boolean;
  theme: string;
}

const defaults: UserPreferences = {
  dismissed_seller_onboarding: false,
  dismissed_provider_onboarding: false,
  theme: "system",
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPreferences();
    else { setPreferences(defaults); setLoading(false); }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPreferences({
        dismissed_seller_onboarding: data.dismissed_seller_onboarding,
        dismissed_provider_onboarding: data.dismissed_provider_onboarding,
        theme: data.theme || "system",
      });
    }
    setLoading(false);
  };

  const updatePreference = useCallback(async (key: keyof UserPreferences, value: any) => {
    if (!user) return;
    setPreferences((prev) => ({ ...prev, [key]: value }));
    await (supabase as any).from("user_preferences").upsert(
      { user_id: user.id, [key]: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }, [user]);

  return { preferences, loading, updatePreference };
}
