import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = ""; // Will use in-app notifications as fallback when no VAPID key

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error("Les notifications ne sont pas supportées par votre navigateur");
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast.success("Notifications activées !");
      // Register for in-app push
      if (user) {
        await registerSubscription();
      }
      return true;
    } else if (result === "denied") {
      toast.error("Notifications bloquées. Activez-les dans les paramètres du navigateur.");
      return false;
    }
    return false;
  }, [isSupported, user]);

  const registerSubscription = async () => {
    if (!user || !("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if push manager is available and VAPID key is set
      if (!registration.pushManager || !VAPID_PUBLIC_KEY) {
        // Use in-app notifications only (already handled by useNotifications)
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      const keys = subscription.toJSON().keys;
      if (keys) {
        await (supabase as any).from("push_subscriptions").upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }, { onConflict: "user_id,endpoint" });
      }
    } catch (err) {
      // Silently fail - in-app notifications still work
      console.log("Push subscription not available, using in-app notifications");
    }
  };

  const sendLocalNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== "granted") return;

    try {
      new Notification(title, {
        body,
        icon: icon || "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        tag: `miyashi-${Date.now()}`,
      });
    } catch {
      // Fallback: notification API not available in this context
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendLocalNotification,
  };
};
