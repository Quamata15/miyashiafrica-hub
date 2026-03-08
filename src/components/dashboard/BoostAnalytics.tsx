import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Clock, MapPin, TrendingUp, Plus, Rocket, Eye, MousePointer, ShoppingCart, Megaphone, BarChart3 } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const BoostAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boosts, setBoosts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("boosts");

  useEffect(() => {
    if (user) {
      fetchBoosts();
      fetchMetrics();
      fetchCampaigns();
    }
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

  const fetchMetrics = async () => {
    if (!user) return;
    const { data } = await (supabase.from("boost_metrics") as any)
      .select("*, boosts!inner(user_id)")
      .eq("boosts.user_id", user.id)
      .order("date", { ascending: true })
      .limit(90);
    if (data) setMetrics(data);
  };

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await (supabase.from("campaigns") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data);
  };

  const activeBoosts = boosts.filter(b => b.is_active && new Date(b.expires_at) > new Date());
  const expiredBoosts = boosts.filter(b => !b.is_active || new Date(b.expires_at) <= new Date());
  const totalSpent = boosts.reduce((s, b) => s + Number(b.price_paid), 0);
  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

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

  // Aggregate metrics by date for chart
  const chartData = metrics.reduce((acc: any[], m) => {
    const existing = acc.find(a => a.date === m.date);
    if (existing) {
      existing.views += m.views;
      existing.clicks += m.clicks;
      existing.conversions += m.conversions;
    } else {
      acc.push({ date: m.date, views: m.views, clicks: m.clicks, conversions: m.conversions });
    }
    return acc;
  }, []).slice(-30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Boosts & Campagnes</h2>
          <p className="text-sm text-muted-foreground">Suivez la performance de vos mises en avant</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/campaigns")}>
            <Megaphone className="w-4 h-4 mr-1" /> Campagnes
          </Button>
          <Button onClick={() => navigate("/boost")} className="bg-primary">
            <Plus className="w-4 h-4 mr-1" /> Nouveau boost
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeBoosts.length}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Vues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ctr}%</p>
              <p className="text-xs text-muted-foreground">CTR</p>
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
              <p className="text-xs text-muted-foreground">Investi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Performance des 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => format(new Date(v), "dd/MM")}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={v => format(new Date(v as string), "dd MMM yyyy", { locale: fr })}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Vues" />
                  <Bar dataKey="clicks" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} name="Clics" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="boosts">Boosts ({boosts.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="boosts" className="space-y-4 mt-4">
          {activeBoosts.length > 0 ? (
            activeBoosts.map((boost) => (
              <Card key={boost.id} className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground capitalize">{boost.boost_type}</Badge>
                      <Badge variant="outline" className="text-xs">{periodLabels[boost.period] || boost.period}</Badge>
                    </div>
                    <span className="text-sm font-semibold text-primary">{getRemainingTime(boost)}</span>
                  </div>
                  <Progress value={getProgress(boost)} className="h-2 mb-3" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {boost.zone_radius_km} km</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(boost.expires_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-8 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-3">Aucun boost actif</p>
                <Button onClick={() => navigate("/boost")} size="sm">
                  <Zap className="w-4 h-4 mr-1" /> Créer un boost
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {campaigns.length > 0 ? (
            campaigns.map(campaign => {
              const budgetPct = campaign.budget_total > 0
                ? Math.min(100, (Number(campaign.budget_spent) / Number(campaign.budget_total)) * 100) : 0;
              return (
                <Card key={campaign.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm">{campaign.name}</span>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">{campaign.status}</Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-muted-foreground mb-2">{campaign.description}</p>
                    )}
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Budget</span>
                      <span>{Number(campaign.budget_spent).toLocaleString()} / {Number(campaign.budget_total).toLocaleString()} F</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${budgetPct}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-8 text-center">
                <Megaphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-3">Aucune campagne</p>
                <Button onClick={() => navigate("/campaigns")} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Créer une campagne
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {expiredBoosts.length > 0 ? (
            <Card className="border-0 shadow-card">
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
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Aucun historique</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BoostAnalytics;
