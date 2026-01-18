import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Star,
  Clock,
  CheckCircle,
  Truck,
  BarChart3,
  Briefcase,
  MessageSquare,
  Bell
} from "lucide-react";
import OrdersTable from "@/components/dashboard/OrdersTable";
import SalesChart from "@/components/dashboard/SalesChart";
import ProductsList from "@/components/dashboard/ProductsList";
import ServicesList from "@/components/dashboard/ServicesList";
import DeliveryTracking from "@/components/dashboard/DeliveryTracking";
import ServiceMilestones from "@/components/dashboard/ServiceMilestones";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface DashboardStats {
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number;
  totalReviews: number;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalReviews: 0
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id);

      // Fetch services count
      const { count: servicesCount } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", user.id);

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user.id);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewed_user_id", user.id);

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_price), 0) || 0;
      const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;
      const completedOrders = orders?.filter(o => o.status === "completed").length || 0;
      const avgRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      setStats({
        totalProducts: productsCount || 0,
        totalServices: servicesCount || 0,
        totalOrders: orders?.length || 0,
        totalRevenue,
        pendingOrders,
        completedOrders,
        averageRating: avgRating,
        totalReviews: reviews?.length || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { 
      title: "Produits", 
      value: stats.totalProducts, 
      icon: Package, 
      color: "bg-blue-500",
      description: "Produits actifs"
    },
    { 
      title: "Services", 
      value: stats.totalServices, 
      icon: Briefcase, 
      color: "bg-purple-500",
      description: "Services actifs"
    },
    { 
      title: "Commandes", 
      value: stats.totalOrders, 
      icon: ShoppingCart, 
      color: "bg-green-500",
      description: "Total commandes"
    },
    { 
      title: "Revenus", 
      value: `${stats.totalRevenue.toLocaleString()} FCFA`, 
      icon: DollarSign, 
      color: "bg-yellow-500",
      description: "Revenus totaux"
    },
    { 
      title: "En attente", 
      value: stats.pendingOrders, 
      icon: Clock, 
      color: "bg-orange-500",
      description: "Commandes en attente"
    },
    { 
      title: "Complétées", 
      value: stats.completedOrders, 
      icon: CheckCircle, 
      color: "bg-teal-500",
      description: "Commandes terminées"
    },
    { 
      title: "Note moyenne", 
      value: stats.averageRating.toFixed(1), 
      icon: Star, 
      color: "bg-amber-500",
      description: `${stats.totalReviews} avis`
    },
    { 
      title: "Croissance", 
      value: "+12%", 
      icon: TrendingUp, 
      color: "bg-emerald-500",
      description: "Ce mois-ci"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Tableau de bord
              </h1>
              <p className="text-muted-foreground">
                Gérez vos ventes, commandes et performances
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/messages")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button variant="hero" onClick={() => navigate("/create")}>
                + Créer
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden hover:shadow-elevated transition-all duration-300 group">
                  <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <stat.icon className={`h-5 w-5 text-muted-foreground`} />
                      <Badge variant="secondary" className="text-xs">
                        {stat.description}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">
                      {loadingStats ? "..." : stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 h-auto p-1 bg-muted/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Package className="h-4 w-4 mr-2" />
                Produits
              </TabsTrigger>
              <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Briefcase className="h-4 w-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger value="delivery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Truck className="h-4 w-4 mr-2" />
                Livraisons
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesChart />
                <Card>
                  <CardHeader>
                    <CardTitle>Activité récente</CardTitle>
                    <CardDescription>Dernières commandes et interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OrdersTable limit={5} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Toutes les commandes</CardTitle>
                  <CardDescription>Gérez vos commandes et leur statut</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrdersTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <ProductsList />
            </TabsContent>

            <TabsContent value="services">
              <ServicesList />
            </TabsContent>

            <TabsContent value="delivery">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DeliveryTracking />
                <ServiceMilestones />
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsList />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
