import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverPosition {
  lat: number;
  lng: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}

/**
 * Hook for the DRIVER to broadcast their GPS position in real-time.
 * Uses browser Geolocation API + Supabase Realtime Broadcast.
 */
export const useDriverBroadcast = (deliveryId: string | null, enabled: boolean = true) => {
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [currentPosition, setCurrentPosition] = useState<DriverPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!deliveryId || !enabled || !navigator.geolocation) {
      if (!navigator.geolocation) setError("Géolocalisation non supportée");
      return;
    }

    const channelName = `delivery-gps-${deliveryId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;
    channel.subscribe();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position: DriverPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
        };
        setCurrentPosition(position);
        setError(null);

        channel.send({
          type: "broadcast",
          event: "driver-position",
          payload: position,
        });
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    return stopTracking;
  }, [deliveryId, enabled, stopTracking]);

  return { currentPosition, error, stopTracking };
};

/**
 * Hook for the BUYER to subscribe to a driver's real-time GPS position.
 */
export const useDriverTracking = (deliveryId: string | null) => {
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;

    const channelName = `delivery-gps-${deliveryId}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "driver-position" }, ({ payload }) => {
        if (payload?.lat && payload?.lng) {
          setDriverPosition(payload as DriverPosition);
        }
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [deliveryId]);

  return { driverPosition, isConnected };
};
