import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Clock, CheckCircle, DollarSign, Calendar, Navigation, TrendingUp } from "lucide-react";
import { format, startOfDay, subDays, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

const DriverDeliveryHistory = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("delivery_requests")
      .select("*")
      .eq("driver_id", user.id)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .limit(50);
    if (data) setDeliveries(data);
    setLoading(false);
  };

  // Group by day
  const grouped = deliveries.reduce<Record<string, any[]>>((acc, d) => {
    const day = startOfDay(new Date(d.delivered_at || d.created_at)).toISOString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(d);
    return acc;
  }, {});

  const dailyEarnings = Object.entries(grouped).map(([day, items]) => ({
    day,
    count: items.length,
    total: items.reduce((s, d) => s + (d.total_delivery_price || 0) - (d.commission || 0), 0),
    commission: items.reduce((s, d) => s + (d.commission || 0), 0),
  }));

  const openGPS = (location: any, address?: string) => {
    if (location?.lat && location?.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, "_blank");
    } else if (address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
    }
  };

  const formatDay = (iso: string) => {
    const d = new Date(iso);
    if (isToday(d)) return "Aujourd'hui";
    if (isYesterday(d)) return "Hier";
    return format(d, "EEEE d MMMM", { locale: fr });
  };

  return (
    <div className="space-y-6">
      {/* Daily earnings summary */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Gains par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyEarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune livraison terminée</p>
          ) : (
            <div className="space-y-3">
              {dailyEarnings.slice(0, 7).map(({ day, count, total, commission }) => (
                <div key={day} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{formatDay(day)}</p>
                      <p className="text-xs text-muted-foreground">{count} livraison{count > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">{total.toLocaleString()}F</p>
                    <p className="text-xs text-muted-foreground">-{commission.toLocaleString()}F comm.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery history */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique des livraisons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chargement...</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune livraison terminée</p>
          ) : (
            <div className="space-y-3">
              {deliveries.map((d) => (
                <div key={d.id} className="p-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">
                        {d.delivered_at ? format(new Date(d.delivered_at), "dd/MM/yyyy HH:mm") : "—"}
                      </span>
                    </div>
                    <Badge className="bg-accent text-accent-foreground text-xs">Livré</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{d.pickup_address || "Retrait"} → {d.delivery_address || "Livraison"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span>{d.distance_km} km</span>
                      <span className="font-semibold text-foreground">
                        {((d.total_delivery_price || 0) - (d.commission || 0)).toLocaleString()}F net
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => openGPS(d.delivery_location, d.delivery_address)}
                    >
                      <Navigation className="w-3 h-3 mr-1" /> GPS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDeliveryHistory;
