import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Users, Package, DollarSign,
  ShoppingCart, Truck, Briefcase, Star, Activity,
} from "lucide-react";

const COLORS = [
  "hsl(43, 93%, 49%)", "hsl(27, 100%, 45%)", "hsl(152, 70%, 39%)",
  "hsl(210, 60%, 50%)", "hsl(14, 85%, 40%)", "hsl(280, 60%, 50%)",
];

const AdminAnalytics = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalRevenue: 0, revenueGrowth: 0,
    totalOrders: 0, ordersGrowth: 0,
    totalUsers: 0, usersGrowth: 0,
    avgOrderValue: 0, activeDisputes: 0,
    completionRate: 0, totalDrivers: 0,
    totalServices: 0, totalFreelancers: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));
    const prevStartDate = startOfDay(subDays(new Date(), days * 2));

    // Fetch all data in parallel
    const [ordersRes, prevOrdersRes, profilesRes, prevProfilesRes, disputesRes, driversRes, servicesRes, freelancersRes] = await Promise.all([
      supabase.from("orders").select("total_price, status, created_at, product_id").gte("created_at", startDate.toISOString()),
      supabase.from("orders").select("total_price, created_at").gte("created_at", prevStartDate.toISOString()).lt("created_at", startDate.toISOString()),
      supabase.from("profiles").select("created_at"),
      supabase.from("profiles").select("created_at").gte("created_at", prevStartDate.toISOString()).lt("created_at", startDate.toISOString()),
      (supabase.from("disputes") as any).select("status"),
      (supabase.from("driver_profiles") as any).select("id"),
      supabase.from("services").select("id"),
      (supabase.from("freelance_profiles") as any).select("id"),
    ]);

    const orders = ordersRes.data || [];
    const prevOrders = prevOrdersRes.data || [];
    const profiles = profilesRes.data || [];
    const prevProfiles = prevProfilesRes.data || [];

    // KPIs
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const completedOrders = orders.filter(o => o.status === "completed").length;
    const completionRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;

    const newUsers = profiles.filter(p => new Date(p.created_at) >= startDate).length;
    const prevNewUsers = prevProfiles.length;
    const usersGrowth = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;

    setKpis({
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth),
      totalOrders: orders.length,
      ordersGrowth: prevOrders.length > 0 ? Math.round(((orders.length - prevOrders.length) / prevOrders.length) * 100) : 0,
      totalUsers: profiles.length,
      usersGrowth: Math.round(usersGrowth),
      avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      activeDisputes: (disputesRes.data || []).filter((d: any) => d.status === "open").length,
      completionRate: Math.round(completionRate),
      totalDrivers: driversRes.data?.length || 0,
      totalServices: servicesRes.data?.length || 0,
      totalFreelancers: freelancersRes.data?.length || 0,
    });

    // Revenue chart data
    const grouped: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      grouped[date] = { revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const date = format(new Date(o.created_at), "yyyy-MM-dd");
      if (grouped[date]) {
        grouped[date].revenue += Number(o.total_price || 0);
        grouped[date].orders += 1;
      }
    });
    setRevenueData(
      Object.entries(grouped)
        .map(([date, v]) => ({ date: format(new Date(date), "dd MMM", { locale: fr }), ...v }))
        .reverse()
    );

    // Orders by status pie
    const statusCount: Record<string, number> = {};
    orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
    setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

    // Top products
    const productCount: Record<string, number> = {};
    orders.forEach(o => { if (o.product_id) productCount[o.product_id] = (productCount[o.product_id] || 0) + 1; });
    const topIds = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topIds.length > 0) {
      const { data: products } = await supabase.from("products").select("id, title").in("id", topIds.map(([id]) => id));
      setTopProducts(topIds.map(([id, count]) => ({
        name: products?.find(p => p.id === id)?.title?.slice(0, 20) || id.slice(0, 8),
        commandes: count,
      })));
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "En attente", confirmed: "Confirmé", processing: "En cours",
    shipped: "Expédié", delivered: "Livré", completed: "Terminé", cancelled: "Annulé",
  };

  const kpiCards = [
    { label: "Revenus", value: `${kpis.totalRevenue.toLocaleString()}F`, growth: kpis.revenueGrowth, icon: DollarSign, color: "text-primary" },
    { label: "Commandes", value: kpis.totalOrders, growth: kpis.ordersGrowth, icon: ShoppingCart, color: "text-secondary" },
    { label: "Utilisateurs", value: kpis.totalUsers, growth: kpis.usersGrowth, icon: Users, color: "text-accent" },
    { label: "Panier moyen", value: `${kpis.avgOrderValue.toLocaleString()}F`, growth: null, icon: Package, color: "text-info" },
    { label: "Taux complétion", value: `${kpis.completionRate}%`, growth: null, icon: Activity, color: "text-primary" },
    { label: "Litiges ouverts", value: kpis.activeDisputes, growth: null, icon: Star, color: "text-destructive" },
    { label: "Livreurs", value: kpis.totalDrivers, growth: null, icon: Truck, color: "text-secondary" },
    { label: "Freelancers", value: kpis.totalFreelancers, growth: null, icon: Briefcase, color: "text-accent" },
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Tableau de bord analytique</h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="7d">7 jours</TabsTrigger>
            <TabsTrigger value="30d">30 jours</TabsTrigger>
            <TabsTrigger value="90d">90 jours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                {kpi.growth !== null && kpi.growth !== 0 && (
                  <span className={`text-xs font-medium flex items-center gap-1 ${kpi.growth > 0 ? "text-accent" : "text-destructive"}`}>
                    {kpi.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.growth > 0 ? "+" : ""}{kpi.growth}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenus & Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43, 93%, 49%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(43, 93%, 49%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adminOrdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 70%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152, 70%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenus (FCFA)" stroke="hsl(43, 93%, 49%)" strokeWidth={2} fill="url(#adminRevGrad)" />
                  <Area yAxisId="ord" type="monotone" dataKey="orders" name="Commandes" stroke="hsl(152, 70%, 39%)" strokeWidth={2} fill="url(#adminOrdGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Commandes par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${statusLabels[name] || name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, statusLabels[name] || name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="commandes" fill="hsl(27, 100%, 45%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform metrics */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{kpis.totalServices}</p>
              <p className="text-sm text-muted-foreground">Services actifs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-secondary">{kpis.totalDrivers}</p>
              <p className="text-sm text-muted-foreground">Livreurs inscrits</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{kpis.totalFreelancers}</p>
              <p className="text-sm text-muted-foreground">Freelancers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-info">{kpis.completionRate}%</p>
              <p className="text-sm text-muted-foreground">Taux de complétion</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
