import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

const SalesChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SalesData[]>([]);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSalesData();
    }
  }, [user, period]);

  const fetchSalesData = async () => {
    if (!user) return;

    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));

    const { data: orders, error } = await supabase
      .from("orders")
      .select("total_price, created_at")
      .eq("seller_id", user.id)
      .gte("created_at", startDate.toISOString());

    if (!error && orders) {
      // Group by date
      const groupedData: Record<string, { revenue: number; orders: number }> = {};

      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        groupedData[date] = { revenue: 0, orders: 0 };
      }

      orders.forEach((order) => {
        const date = format(new Date(order.created_at), "yyyy-MM-dd");
        if (groupedData[date]) {
          groupedData[date].revenue += Number(order.total_price);
          groupedData[date].orders += 1;
        }
      });

      const chartData = Object.entries(groupedData)
        .map(([date, values]) => ({
          date: format(new Date(date), "dd MMM", { locale: fr }),
          ...values,
        }))
        .reverse();

      setData(chartData);
    }
    setLoading(false);
  };

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Statistiques de ventes</CardTitle>
            <CardDescription>
              Revenus: {totalRevenue.toLocaleString()} FCFA | Commandes: {totalOrders}
            </CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="7d">7j</TabsTrigger>
              <TabsTrigger value="30d">30j</TabsTrigger>
              <TabsTrigger value="90d">90j</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Chargement...
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, "Revenus"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;
