import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PushNotificationToggle = () => {
  const { permission, isSupported, requestPermission } = usePushNotifications();

  if (!isSupported) return null;

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellRing className="h-4 w-4 text-accent" />
        <span>Notifications activées</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestPermission}
      className="gap-2"
    >
      {permission === "denied" ? (
        <>
          <BellOff className="h-4 w-4" />
          Notifications bloquées
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Activer les notifications
        </>
      )}
    </Button>
  );
};

export default PushNotificationToggle;
