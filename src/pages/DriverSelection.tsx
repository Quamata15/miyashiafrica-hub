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

  const vehicleRates: Record<string, number> = {
    moto: 550, tricycle: 1000, voiture: 1500, camionnette: 2000,
  };

  // Check if there's a paid order
  const [hasPaidOrder, setHasPaidOrder] = useState(false);
  const [paidOrder, setPaidOrder] = useState<any>(null);

  useEffect(() => {
    if (user) checkPaidOrder();
  }, [user]);

  const checkPaidOrder = async () => {
    if (!user) return;
    // Get latest paid order for this buyer
    const { data } = await supabase.from("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setPaidOrder(data);
      setHasPaidOrder(true);
    }
  };

  const requestDriver = async (driverId: string) => {
    if (!user) return;
    if (!hasPaidOrder || !paidOrder) {
      toast({ title: "Paiement requis", description: "Vous devez d'abord payer votre commande", variant: "destructive" });
      navigate("/checkout");
      return;
    }
    setRequesting(driverId);

    const actualOrderId = paidOrder.id;

    const { error } = await (supabase.from("delivery_requests") as any).insert({
      order_id: actualOrderId,
      driver_id: driverId,
      buyer_id: user.id,
      seller_id: paidOrder.seller_id,
      status: "pending",
      vehicle_type: selectedVehicle,
      distance_km: 5,
      base_price: 5 * vehicleRates[selectedVehicle],
      commission: 5 * vehicleRates[selectedVehicle] * 0.18,
      total_delivery_price: 5 * vehicleRates[selectedVehicle],
    });

    // Notification is now handled automatically by database trigger on delivery_requests insert

    setRequesting(null);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de demander ce livreur", variant: "destructive" });
    } else {
      toast({ title: "Demande envoyée! 🚀", description: "Le livreur a été notifié de votre demande" });
      navigate("/dashboard");
    }
  };

  const filteredDrivers = drivers.filter(d => selectedVehicle === "all" || d.vehicle_type === selectedVehicle);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Choisir un livreur</h1>
            <p className="text-muted-foreground">Sélectionnez un livreur disponible dans votre zone</p>
          </motion.div>

          <div className="flex flex-wrap gap-4 mb-8">
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
              <CardContent className="p-12 text-center">
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
                          disabled={requesting === driver.user_id}
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
