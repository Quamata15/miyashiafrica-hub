// Buyer side: where the driver is and how long until arrival (refreshed every 15 s).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DeliveryMap from "./DeliveryMap";

type Tracking = { status: string; driver?: { lat: number; lng: number; seen_at: string } | null; destination?: { lat: number; lng: number } | null; distance_km?: number | null; eta_min?: number | null };

export default function LiveTracking({ orderId }: { orderId: string }) {
  const [t, setT] = useState<Tracking | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => supabase.rpc("get_delivery_tracking", { p_order_id: orderId }).then(({ data }) => { if (!stop) setT(data as Tracking); });
    load();
    const id = setInterval(load, 15000);
    return () => { stop = true; clearInterval(id); };
  }, [orderId]);
  if (!t) return <p className="text-sm text-muted-foreground">Chargement du suivi…</p>;
  if (t.status === "no_driver") return <p className="text-sm text-muted-foreground">Aucun livreur n'a encore accepté la course.</p>;
  const stale = t.driver?.seen_at ? Date.now() - new Date(t.driver.seen_at).getTime() > 5 * 60000 : true;
  return (
    <div className="space-y-2">
      <p className="text-sm">
        {t.status === "delivered" ? "Colis livré." : !t.driver ? "Le livreur n'a pas encore partagé sa position."
          : `Livreur à ${t.distance_km ?? "?"} km${t.eta_min ? `, arrivée dans environ ${t.eta_min} min` : ""}${stale ? " (position d'il y a plus de 5 min)" : ""}.`}
      </p>
      {t.driver && t.destination && (
        <div className="overflow-hidden rounded-xl border border-foreground/10">
          <DeliveryMap orderId={orderId} destination={t.destination} origin={t.driver} currentLocation={t.driver}
            deliveryStatus={t.status === "picked_up" ? "in_transit" : t.status} estimatedTime={t.eta_min ? `${t.eta_min} min` : undefined} enableRealtime={false} />
        </div>
      )}
    </div>
  );
}
