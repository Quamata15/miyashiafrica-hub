import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Clock, CheckCircle, Truck, Star, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import QuickStatsGrid from "./QuickStatsGrid";
import LoyaltyCard from "./LoyaltyCard";

const BuyerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, product:products(title, images), service:services(title)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setOrders(data);
    setLoading(false);
  };

  const confirmReception = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc("confirm_order_reception", { p_order_id: orderId });
      if (error) throw error;
      toast.success("Réception confirmée ! Les fonds ont été libérés.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la confirmation");
    }
  };

  const pending = orders.filter(o => ["pending", "confirmed", "processing"].includes(o.status));
  const shipped = orders.filter(o => o.status === "shipped");
  const completed = orders.filter(o => o.status === "completed");
  const total = orders.reduce((s, o) => s + Number(o.total_price), 0);

  const stats = [
    { label: "Commandes totales", value: orders.length, icon: ShoppingCart, trend: "neutral" as const },
    { label: "En cours", value: pending.length + shipped.length, icon: Clock, trend: pending.length > 0 ? "up" as const : "neutral" as const, trendValue: pending.length > 0 ? "actif" : "" },
    { label: "Livraisons en route", value: shipped.length, icon: Truck },
    { label: "Total dépensé", value: `${total.toLocaleString()}F`, icon: DollarSign },
  ];

  const statusLabel: Record<string, string> = {
    pending: "En attente", confirmed: "Confirmé", processing: "En cours",
    shipped: "En livraison", delivered: "Livré", completed: "Terminé", cancelled: "Annulé"
  };

  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground", confirmed: "bg-primary/10 text-primary",
    processing: "bg-primary/10 text-primary", shipped: "bg-accent/10 text-accent",
    delivered: "bg-accent/10 text-accent", completed: "bg-accent text-accent-foreground",
    cancelled: "bg-destructive/10 text-destructive"
  };

  return (
    <div className="space-y-4">
      <QuickStatsGrid stats={stats} loading={loading} />
      
      {/* Loyalty Program */}
      <LoyaltyCard />

      {/* Shipments to confirm */}
      {orders.filter(o => o.status === "shipped" || o.status === "delivered").length > 0 && (
        <Card className="border-0 shadow-card border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              À confirmer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orders.filter(o => o.status === "shipped" || o.status === "delivered").map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-accent/5 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {order.product?.images?.[0] ? (
                      <img src={order.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.product?.title || order.service?.title || `#${order.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground">{Number(order.total_price).toLocaleString()}F</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => confirmReception(order.id)} className="bg-accent text-accent-foreground shrink-0">
                  <CheckCircle className="w-4 h-4 mr-1" /> Confirmer réception
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Mes commandes récentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/marketplace")}>
              Explorer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucune commande</p>
              <p className="text-sm">Explorez le marketplace pour commencer</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/marketplace")}>
                Voir les produits
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {order.product?.images?.[0] ? (
                      <img src={order.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {order.product?.title || order.service?.title || `Commande #${order.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <p className="font-semibold text-sm whitespace-nowrap">{Number(order.total_price).toLocaleString()}F</p>
                  <Badge className={`text-xs shrink-0 ${statusColor[order.status] || ""}`}>
                    {statusLabel[order.status] || order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerOverview;
