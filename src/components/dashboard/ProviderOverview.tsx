import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Package, Star, Plus, Zap, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QuickStatsGrid from "./QuickStatsGrid";
import SalesChart from "./SalesChart";

const ProviderOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [servRes, ordRes] = await Promise.all([
      supabase.from("services").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("*, service:services(title)").eq("seller_id", user.id).not("service_id", "is", null).order("created_at", { ascending: false }).limit(15),
    ]);
    if (servRes.data) setServices(servRes.data);
    if (ordRes.data) {
      setOrders(ordRes.data);
      // Fetch milestones for active orders
      const activeOrderIds = ordRes.data.filter(o => o.status !== "completed" && o.status !== "cancelled").map(o => o.id);
      if (activeOrderIds.length > 0) {
        const { data: ms } = await supabase.from("service_milestones").select("*").in("order_id", activeOrderIds).order("order_index");
        if (ms) setMilestones(ms);
      }
    }
    setLoading(false);
  };

  const revenue = orders.reduce((s, o) => s + Number(o.total_price), 0);
  const activeServices = services.filter(s => s.is_active).length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const stats = [
    { label: "Services actifs", value: activeServices, icon: Briefcase },
    { label: "Commandes", value: orders.length, icon: Package },
    { label: "En attente", value: pendingOrders, icon: Clock, trend: pendingOrders > 0 ? "up" as const : "neutral" as const },
    { label: "Revenus", value: `${revenue.toLocaleString()}F`, icon: DollarSign, trend: "up" as const, trendValue: "total" },
  ];

  const statusLabel: Record<string, string> = {
    pending: "En attente", confirmed: "Confirmé", processing: "En cours",
    completed: "Terminé", cancelled: "Annulé"
  };

  return (
    <div className="space-y-6">
      <QuickStatsGrid stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />

        {/* Services */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mes services</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate("/boost?type=service")}>
                  <Zap className="w-3 h-3 mr-1" /> Booster
                </Button>
                <Button size="sm" onClick={() => navigate("/create?type=service")} className="bg-primary">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {services.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun service</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/create?type=service")}>
                  Créer votre premier service
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {services.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/service/${s.id}`)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.price ? `${Number(s.price).toLocaleString()}F` : "Sur devis"} • {s.delivery_days ? `${s.delivery_days}j` : "Flexible"}
                      </p>
                    </div>
                    <Badge variant={s.is_active ? "default" : "outline"} className="text-xs">
                      {s.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active order milestones */}
      {milestones.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Étapes de prestation en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    m.status === "completed" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {m.order_index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <Badge variant={m.status === "completed" ? "default" : "outline"} className="text-xs">
                    {m.status === "completed" ? "Fait" : m.status === "in_progress" ? "En cours" : "À faire"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderOverview;
