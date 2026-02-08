import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, MapPin, Star, DollarSign, Package, Clock,
  CheckCircle, TrendingUp, Award, Navigation, Bell
} from "lucide-react";

const DriverDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDriverData();
      subscribeToDeliveries();
    }
  }, [user]);

  const fetchDriverData = async () => {
    if (!user) return;

    const [profileRes, pendingRes, myRes] = await Promise.all([
      (supabase.from("driver_profiles") as any).select("*").eq("user_id", user.id).maybeSingle(),
      (supabase.from("delivery_requests") as any).select("*").eq("status", "pending").order("created_at", { ascending: false }),
      (supabase.from("delivery_requests") as any).select("*").eq("driver_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) {
      setDriverProfile(profileRes.data);
      setIsAvailable(profileRes.data.is_available);
    }
    if (pendingRes.data) setPendingDeliveries(pendingRes.data);
    if (myRes.data) setMyDeliveries(myRes.data);
    setLoading(false);
  };

  const subscribeToDeliveries = () => {
    if (!user) return;
    const channel = supabase
      .channel("driver-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests" }, () => {
        fetchDriverData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const toggleAvailability = async () => {
    if (!user || !driverProfile) return;
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    await (supabase.from("driver_profiles") as any)
      .update({ is_available: newStatus })
      .eq("user_id", user.id);
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!user) return;
    await (supabase.from("delivery_requests") as any)
      .update({ driver_id: user.id, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", deliveryId);
    fetchDriverData();
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    const updates: any = { status };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();

    await (supabase.from("delivery_requests") as any)
      .update(updates)
      .eq("id", deliveryId);
    fetchDriverData();
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "gold": return "bg-primary text-primary-foreground";
      case "silver": return "bg-muted-foreground text-background";
      default: return "bg-secondary/80 text-secondary-foreground";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24">
          <Card className="max-w-md text-center border-0 shadow-elevated">
            <CardContent className="p-8">
              <Truck className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-display font-bold mb-2">Pas encore livreur ?</h2>
              <p className="text-muted-foreground mb-6">Inscrivez-vous pour commencer à livrer</p>
              <Button onClick={() => navigate("/driver-registration")} className="bg-gradient-hero">
                S'inscrire maintenant
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const stats = [
    { label: "Livraisons", value: driverProfile.total_deliveries, icon: Package },
    { label: "Note moyenne", value: driverProfile.average_rating?.toFixed(1) || "0.0", icon: Star },
    { label: "Points fidélité", value: driverProfile.loyalty_points, icon: Award },
    { label: "Solde", value: `${(driverProfile.commission_balance || 0).toLocaleString()}F`, icon: DollarSign },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-display font-bold">Tableau de bord Livreur</h1>
                <Badge className={getBadgeColor(driverProfile.badge)}>
                  <Award className="w-3 h-3 mr-1" />
                  {driverProfile.badge?.charAt(0).toUpperCase() + driverProfile.badge?.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground">Zone: {driverProfile.zone} • {driverProfile.vehicle_type}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Disponible</span>
                <Switch checked={isAvailable} onCheckedChange={toggleAvailability} />
              </div>
              <Badge className={isAvailable ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>
                {isAvailable ? "En ligne" : "Hors ligne"}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="available" className="space-y-6">
            <TabsList className="grid grid-cols-3 h-auto p-1 bg-muted/50">
              <TabsTrigger value="available" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Navigation className="h-4 w-4 mr-2" /> Disponibles ({pendingDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Truck className="h-4 w-4 mr-2" /> Mes livraisons
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-4 w-4 mr-2" /> Notifications ({unreadCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              <div className="space-y-4">
                {pendingDeliveries.length === 0 ? (
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-8 text-center">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">Aucune livraison disponible</p>
                      <p className="text-sm text-muted-foreground">Les nouvelles commandes apparaîtront ici</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="border-0 shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-secondary" />
                              <span className="font-medium">{delivery.pickup_address || "Adresse de retrait"}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{delivery.delivery_address || "Adresse de livraison"}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{delivery.distance_km} km</span>
                              <span>{delivery.total_delivery_price?.toLocaleString()} FCFA</span>
                              {delivery.night_surcharge && <Badge className="bg-secondary/20 text-secondary text-xs">Nuit +25%</Badge>}
                            </div>
                          </div>
                          <Button onClick={() => acceptDelivery(delivery.id)} className="bg-accent text-accent-foreground">
                            <CheckCircle className="w-4 h-4 mr-2" /> Accepter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="space-y-4">
                {myDeliveries.length === 0 ? (
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-8 text-center">
                      <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">Aucune livraison en cours</p>
                    </CardContent>
                  </Card>
                ) : (
                  myDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="border-0 shadow-card">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                delivery.status === "delivered" ? "bg-accent text-accent-foreground" :
                                delivery.status === "picked_up" ? "bg-primary text-primary-foreground" :
                                "bg-info text-info-foreground"
                              }>
                                {delivery.status === "delivered" ? "Livré" :
                                 delivery.status === "picked_up" ? "En route" :
                                 delivery.status === "accepted" ? "Accepté" : delivery.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{delivery.distance_km} km</span>
                              <span className="font-medium">{delivery.total_delivery_price?.toLocaleString()} FCFA</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {delivery.pickup_address} → {delivery.delivery_address}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {delivery.status === "accepted" && (
                              <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, "picked_up")} className="bg-primary">
                                <Package className="w-4 h-4 mr-1" /> Récupéré
                              </Button>
                            )}
                            {delivery.status === "picked_up" && (
                              <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, "delivered")} className="bg-accent text-accent-foreground">
                                <CheckCircle className="w-4 h-4 mr-1" /> Livré
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-8 text-center">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p>Aucune notification</p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.slice(0, 20).map((notif) => (
                    <Card key={notif.id} className={`border-0 shadow-soft ${!notif.is_read ? "bg-primary/5" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${!notif.is_read ? "bg-primary" : "bg-muted"}`} />
                          <div>
                            <p className="font-medium">{notif.title}</p>
                            {notif.message && <p className="text-sm text-muted-foreground">{notif.message}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverDashboard;
