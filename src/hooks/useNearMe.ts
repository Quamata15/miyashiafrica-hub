// Where is the person? GPS when they already allowed it (or click "use my position"),
// otherwise the city of their profile. Used to show what is within 25 km first.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NearPos = { lat: number; lng: number; source: "gps" | "profile"; city?: string | null };
export const NEAR_KM = 25;
const KEY = "miyashi_pos";

export function useNearMe() {
  const { user } = useAuth();
  const [pos, setPos] = useState<NearPos | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
  });
  const [asking, setAsking] = useState(false);

  const fromGps = useCallback((save: boolean) => new Promise<void>((resolve) => {
    if (!("geolocation" in navigator)) return resolve();
    setAsking(true);
    navigator.geolocation.getCurrentPosition((p) => {
      const next: NearPos = { lat: p.coords.latitude, lng: p.coords.longitude, source: "gps" };
      setPos(next);
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage off */ }
      if (save && user) supabase.rpc("save_my_position", { p_lat: next.lat, p_lng: next.lng }).then(() => undefined);
      setAsking(false); resolve();
    }, () => { setAsking(false); resolve(); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  }), [user]);

  useEffect(() => {
    if (pos?.source === "gps") return;
    let cancelled = false;
    (async () => {
      try {
        const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (st?.state === "granted") { await fromGps(false); return; }
      } catch { /* permissions API missing */ }
      if (!user || cancelled) return;
      const { data } = await supabase.rpc("my_position");
      const d = (Array.isArray(data) ? data[0] : data) as { lat: number | null; lng: number | null; city: string | null } | null;
      if (!cancelled && d?.lat != null && d?.lng != null) setPos({ lat: d.lat, lng: d.lng, source: "profile", city: d.city });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { pos, asking, useGps: () => fromGps(true) };
}

export const kmLabel = (km: number | undefined) => km == null ? null : km < 1 ? "à moins de 1 km" : `à ${Math.round(km)} km`;
