import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Truck, MapPin, Star, DollarSign, Package, Clock,
  CheckCircle, Award, Navigation, Wifi
} from "lucide-react";
import { toast } from "sonner";
import QuickStatsGrid from "./QuickStatsGrid";
import { useDriverBroadcast } from "@/hooks/useDriverLocation";

const DriverOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
      const channel = supabase
        .channel("driver-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests" }, fetchData)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, pendingRes, activeRes] = await Promise.all([
      supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("delivery_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("delivery_requests").select("*").eq("driver_id", user.id).in("status", ["accepted", "picked_up"]).order("created_at", { ascending: false }),
    ]);
    if (profileRes.data) {
      setDriverProfile(profileRes.data);
      setIsAvailable(profileRes.data.is_available);
    }
    if (pendingRes.data) setPendingDeliveries(pendingRes.data);
    if (activeRes.data) setActiveDeliveries(activeRes.data);
    setLoading(false);
  };

  const toggleAvailability = async () => {
    if (!user) return;
    const next = !isAvailable;
    setIsAvailable(next);
    await supabase.from("driver_profiles").update({ is_available: next }).eq("user_id", user.id);
  };

  const acceptDelivery = async (id: string) => {
    if (!user) return;
    await supabase.from("delivery_requests").update({ driver_id: user.id, status: "accepted", accepted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Livraison acceptée !");
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    await supabase.from("delivery_requests").update(updates).eq("id", id);
    toast.success(status === "delivered" ? "Livraison terminée !" : "Statut mis à jour");
    fetchData();
  };

  if (!driverProfile && !loading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-8 text-center">
          <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Pas encore livreur ?</p>
          <Button onClick={() => navigate("/driver-registration")} className="bg-primary">S'inscrire</Button>
        </CardContent>
      </Card>
    );
  }

  const badgeColors: Record<string, string> = {
    gold: "bg-primary text-primary-foreground",
    silver: "bg-muted-foreground text-background",
    bronze: "bg-secondary/80 text-secondary-foreground",
  };

  const stats = [
    { label: "Livraisons totales", value: driverProfile?.total_deliveries || 0, icon: Package },
    { label: "Note moyenne", value: driverProfile?.average_rating?.toFixed(1) || "0.0", icon: Star },
    { label: "Points fidélité", value: driverProfile?.loyalty_points || 0, icon: Award },
    { label: "Gains", value: `${(driverProfile?.commission_balance || 0).toLocaleString()}F`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Driver header with availability toggle */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isAvailable ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{driverProfile?.zone || "Lomé"}</span>
                  <Badge className={badgeColors[driverProfile?.badge] || badgeColors.bronze}>
                    <Award className="w-3 h-3 mr-1" />
                    {driverProfile?.badge?.charAt(0).toUpperCase() + driverProfile?.badge?.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{driverProfile?.vehicle_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">{isAvailable ? "En ligne" : "Hors ligne"}</span>
              <Switch checked={isAvailable} onCheckedChange={toggleAvailability} />
            </div>
          </div>
        </CardContent>
      </Card>

      <QuickStatsGrid stats={stats} loading={loading} />

      {/* Active deliveries */}
      {activeDeliveries.length > 0 && (
        <Card className="border-0 shadow-card border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Livraisons en cours ({activeDeliveries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeDeliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-sm">{d.pickup_address || "Retrait"}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm">{d.delivery_address || "Livraison"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{d.distance_km} km</span>
                    <span className="font-semibold text-foreground">{d.total_delivery_price?.toLocaleString()}F</span>
                  </div>
                </div>
                {d.status === "accepted" && (
                  <Button size="sm" onClick={() => updateStatus(d.id, "picked_up")} className="bg-primary">
                    <Package className="w-4 h-4 mr-1" /> Récupéré
                  </Button>
                )}
                {d.status === "picked_up" && (
                  <Button size="sm" onClick={() => updateStatus(d.id, "delivered")} className="bg-accent text-accent-foreground">
                    <CheckCircle className="w-4 h-4 mr-1" /> Livré
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending deliveries */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Livraisons disponibles ({pendingDeliveries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDeliveries.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">Aucune livraison disponible pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3 h-3 text-secondary" />
                      <span>{d.pickup_address || "Retrait"} → {d.delivery_address || "Livraison"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{d.distance_km} km</span>
                      <span className="font-semibold text-foreground">{d.total_delivery_price?.toLocaleString()}F</span>
                      {d.night_surcharge && <Badge variant="outline" className="text-xs">Nuit</Badge>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => acceptDelivery(d.id)} className="bg-accent text-accent-foreground">
                    Accepter
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverOverview;
