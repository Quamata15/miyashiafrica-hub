import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AnalyticsEvent =
  | "page_view"
  | "product_view"
  | "service_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_start"
  | "order_complete"
  | "search"
  | "filter_apply"
  | "favorite_add"
  | "favorite_remove"
  | "signup"
  | "login"
  | "profile_view"
  | "boost_create"
  | "message_send";

interface TrackOptions {
  category?: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  const track = useCallback(
    async (event: AnalyticsEvent, options: TrackOptions = {}) => {
      try {
        await supabase.from("analytics_events").insert({
          user_id: user?.id || null,
          event_name: event,
          event_category: options.category || null,
          event_label: options.label || null,
          event_value: options.value || null,
          metadata: options.metadata || null,
          page_url: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          session_id: getSessionId(),
        });
      } catch {
        // Silently fail - analytics should never block UX
      }
    },
    [user]
  );

  return { track };
};

// Simple session ID management
function getSessionId(): string {
  const key = "miyashi_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
