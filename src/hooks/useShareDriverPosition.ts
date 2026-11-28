// Driver side: while a course is in progress, the position is shared every 30 s (with permission).
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useShareDriverPosition(deliveryIds: string[]) {
  const last = useRef(0);
  const key = deliveryIds.join(",");
  useEffect(() => {
    if (!deliveryIds.length || !("geolocation" in navigator)) return;
    const watch = navigator.geolocation.watchPosition((p) => {
      if (Date.now() - last.current < 30000) return;
      last.current = Date.now();
      deliveryIds.forEach((id) => supabase.rpc("update_driver_location", { p_delivery_id: id, p_lat: p.coords.latitude, p_lng: p.coords.longitude }).then(() => undefined));
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
