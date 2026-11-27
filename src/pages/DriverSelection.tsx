import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Award, MapPin, Truck, Bike, Car, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const DriverSelection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState("moto");
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    const { data } = await (supabase.from("driver_profiles") as any)
      .select("*")
      .eq("is_available", true)
      .order("loyalty_points", { ascending: false });
    if (data) setDrivers(data);
    setLoading(false);
  };

  const getBadgeInfo = (badge: string) => {
    switch (badge) {
      case "gold": return { label: "Or", color: "bg-primary text-primary-foreground" };
      case "silver": return { label: "Argent", color: "bg-muted-foreground text-background" };
      default: return { label: "Bronze", color: "bg-secondary/80 text-secondary-foreground" };
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "voiture": return Car;
      case "camionnette": return Truck;
      default: return Bike;
    }
  };

  // The order to deliver: the one in the link, else the latest home delivery without a driver.
  // A cash-on-delivery order needs no payment first: the driver decides whether to collect the cash.
  type Target = { id: string; total_price: number; payment_status: string; seller_id: string; shipping_address: string | null };
  const [order, setOrder] = useState<Target | null>(null);
  const [active, setActive] = useState<{ id: string; status: string; driver_id: string | null } | null>(null);

  const loadOrder = async () => {
    if (!user) return;
    let q = supabase.from("orders").select("id, total_price, payment_status, seller_id, shipping_address")
      .eq("buyer_id", user.id).in("payment_status", ["paid", "cod_pending"]).eq("fulfillment_method", "delivery")
      .not("product_id", "is", null).not("status", "in", "(completed,cancelled,refunded)");
    q = orderId && orderId !== "latest" ? q.eq("id", orderId) : q.order("created_at", { ascending: false }).limit(1);
    const { data } = await q.maybeSingle();
    setOrder(data as Target | null);
    if (data) {
      const { data: dr } = await supabase.from("delivery_requests").select("id, status, driver_id").eq("order_id", data.id)
        .in("status", ["pending", "accepted", "picked_up"]).maybeSingle();
      setActive(dr);
    }
  };
  useEffect(() => { loadOrder(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, orderId]);
  const cod = order?.payment_status === "cod_pending";

  const requestDriver = async (driverId: string | null) => {
    if (!user || !order) return;
    setRequesting(driverId ?? "all");
    const { data, error } = await supabase.rpc("request_driver" as any, { p_order_id: order.id, p_driver_id: driverId, p_vehicle: selectedVehicle });
    setRequesting(null);
    if (error) {
      toast({ title: "Demande impossible", description: error.message.replace(/^.*?ERROR:\s*/i, ""), variant: "destructive" });
      return;
    }
    const r = data as { price: number; distance_km: number; cash_to_collect: number };
    toast({
      title: driverId ? "Demande envoyée au livreur 🚀" : "Course proposée aux livreurs disponibles 🚀",
      description: cod
        ? `Le livreur doit accepter d'encaisser ${r.cash_to_collect.toLocaleString("fr-FR")} FCFA à la remise (commande + livraison ${r.price.toLocaleString("fr-FR")} FCFA, ${r.distance_km} km).`
        : `Livraison ${r.price.toLocaleString("fr-FR")} FCFA (${r.distance_km} km), réglée depuis votre portefeuille et bloquée jusqu'à la réception.`,
    });
    loadOrder();
  };

  const cancelRequest = async () => {
    if (!active) return;
    const { error } = await supabase.rpc("cancel_delivery_request" as any, { p_id: active.id });
    if (error) { toast({ title: "Annulation impossible", description: error.message.replace(/^.*?ERROR:\s*/i, ""), variant: "destructive" }); return; }
    toast({ title: "Demande annulée", description: "Vous pouvez choisir un autre livreur." });
    loadOrder();
  };

  const filteredDrivers = drivers.filter(d => selectedVehicle === "all" || d.vehicle_type === selectedVehicle);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <h1 className="text-2xl md:text-3xl font-display font-bold">Choisir un livreur</h1>
            <p className="text-sm text-muted-foreground">Sélectionnez un livreur disponible, ou proposez la course à tous.</p>
          </motion.div>

          {!order ? (
            <Card className="mb-4"><CardContent className="p-4 text-sm text-muted-foreground">
              Aucune commande à faire livrer pour l'instant. Les commandes avec livraison à domicile (payées ou à payer à la livraison) apparaissent ici.
              <Button variant="link" className="px-1" onClick={() => navigate("/marketplace")}>Voir les produits</Button>
            </CardContent></Card>
          ) : (
            <Card className="mb-4 border-primary/25">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[14rem] text-sm">
                  <p className="font-medium">Commande #{order.id.slice(0, 8)} · {Number(order.total_price).toLocaleString("fr-FR")} FCFA</p>
                  <p className="text-muted-foreground">
                    {cod ? "Paiement à la livraison : seul un livreur qui accepte d'encaisser l'argent prendra la course." : "Commande payée. La livraison est réglée depuis votre portefeuille et reste bloquée jusqu'à la réception."}
                  </p>
                  {active && <p className="mt-1 text-primary">{active.status === "pending" ? "Demande envoyée : en attente de réponse du livreur." : "Un livreur a accepté la course."}</p>}
                </div>
                {active?.status === "pending" && <Button variant="outline" size="sm" onClick={cancelRequest}>Annuler la demande</Button>}
                {!active && <Button size="sm" onClick={() => requestDriver(null)} disabled={requesting === "all"}>{requesting === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proposer à tous les livreurs"}</Button>}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type de véhicule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moto">🏍️ Moto - 550F/km</SelectItem>
                <SelectItem value="tricycle">🛺 Tricycle - 1000F/km</SelectItem>
                <SelectItem value="voiture">🚗 Voiture - 1500F/km</SelectItem>
                <SelectItem value="camionnette">🚚 Camionnette - 2000F/km</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredDrivers.length} livreurs disponibles</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : filteredDrivers.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-6 sm:p-8 text-center">
                <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun livreur disponible</h3>
                <p className="text-muted-foreground">Essayez un autre type de véhicule</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDrivers.map((driver, i) => {
                const badgeInfo = getBadgeInfo(driver.badge);
                const VehicleIcon = getVehicleIcon(driver.vehicle_type);
                return (
                  <motion.div key={driver.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-0 shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-gradient-hero text-primary-foreground font-bold">
                            <VehicleIcon className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Livreur #{driver.id.slice(0, 6)}</span>
                            <Badge className={badgeInfo.color}>
                              <Award className="w-3 h-3 mr-1" /> {badgeInfo.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              {(driver.average_rating || 0).toFixed(1)}
                            </span>
                            <span>{driver.total_deliveries || 0} livraisons</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {driver.zone}</span>
                            <span className="capitalize">{driver.vehicle_type}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => requestDriver(driver.user_id)}
                          disabled={!order || !!active || requesting === driver.user_id || driver.user_id === user?.id}
                          className="bg-gradient-hero shrink-0"
                        >
                          {requesting === driver.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><CheckCircle className="w-4 h-4 mr-2" /> Choisir</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverSelection;
