import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, MapPin, TrendingUp, Plus, Rocket } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

const BoostAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBoosts();
  }, [user]);

  const fetchBoosts = async () => {
    if (!user) return;
    const { data } = await (supabase.from("boosts") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setBoosts(data);
    setLoading(false);
  };

  const activeBoosts = boosts.filter(b => b.is_active && new Date(b.expires_at) > new Date());
  const expiredBoosts = boosts.filter(b => !b.is_active || new Date(b.expires_at) <= new Date());
  const totalSpent = boosts.reduce((s, b) => s + Number(b.price_paid), 0);

  const getProgress = (boost: any) => {
    const start = new Date(boost.starts_at).getTime();
    const end = new Date(boost.expires_at).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  const getRemainingTime = (boost: any) => {
    const end = new Date(boost.expires_at);
    const now = new Date();
    const days = differenceInDays(end, now);
    if (days > 0) return `${days}j restants`;
    const hours = differenceInHours(end, now);
    if (hours > 0) return `${hours}h restantes`;
    return "Expiré";
  };

  const periodLabels: Record<string, string> = {
    weekly: "1 semaine", monthly: "1 mois", quarterly: "3 mois",
    semi_annual: "6 mois", annual: "12 mois"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Mes Boosts</h2>
          <p className="text-sm text-muted-foreground">Suivez la performance de vos mises en avant</p>
        </div>
        <Button onClick={() => navigate("/boost")} className="bg-primary">
          <Plus className="w-4 h-4 mr-1" /> Nouveau boost
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeBoosts.length}</p>
              <p className="text-xs text-muted-foreground">Boosts actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boosts.length}</p>
              <p className="text-xs text-muted-foreground">Total boosts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSpent.toLocaleString()}F</p>
              <p className="text-xs text-muted-foreground">Total investi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Boosts */}
      {activeBoosts.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Boosts actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeBoosts.map((boost) => (
              <div key={boost.id} className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground capitalize">
                      {boost.boost_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {periodLabels[boost.period] || boost.period}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {getRemainingTime(boost)}
                  </span>
                </div>

                <Progress value={getProgress(boost)} className="h-2 mb-3" />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Rayon: {boost.zone_radius_km} km
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expire le {format(new Date(boost.expires_at), "dd MMM yyyy", { locale: fr })}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expired / History */}
      {expiredBoosts.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Historique</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {expiredBoosts.map((boost) => (
                <div key={boost.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{boost.boost_type} — {periodLabels[boost.period]}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(boost.starts_at), "dd MMM", { locale: fr })} → {format(new Date(boost.expires_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Number(boost.price_paid).toLocaleString()}F</p>
                    <Badge variant="outline" className="text-xs">Terminé</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {boosts.length === 0 && !loading && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-3">Aucun boost utilisé</p>
            <p className="text-sm text-muted-foreground mb-4">Boostez vos produits ou services pour apparaître en premier dans les résultats</p>
            <Button onClick={() => navigate("/boost")}>
              <Zap className="w-4 h-4 mr-1" /> Créer mon premier boost
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BoostAnalytics;
