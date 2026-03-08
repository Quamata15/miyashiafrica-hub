import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import BuyerOverview from "@/components/dashboard/BuyerOverview";
import SellerOverview from "@/components/dashboard/SellerOverview";
import ProviderOverview from "@/components/dashboard/ProviderOverview";
import DriverOverview from "@/components/dashboard/DriverOverview";
import OrdersTable from "@/components/dashboard/OrdersTable";
import ProductsList from "@/components/dashboard/ProductsList";
import ServicesList from "@/components/dashboard/ServicesList";
import DeliveryTracking from "@/components/dashboard/DeliveryTracking";
import ServiceMilestones from "@/components/dashboard/ServiceMilestones";
import NotificationsList from "@/components/dashboard/NotificationsList";
import DeliveryMap from "@/components/map/DeliveryMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu, X, Plus, MessageSquare, BarChart3, MapPin
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (rolesRes.data) setUserRoles(rolesRes.data.map(r => r.role));
    if (profileRes.data) setProfile(profileRes.data);
  };

  // Determine primary role for default overview
  const primaryRole = useMemo(() => {
    if (userRoles.includes("driver")) return "driver";
    if (userRoles.includes("provider")) return "provider";
    if (userRoles.includes("seller")) return "seller";
    return "buyer";
  }, [userRoles]);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        // Show role-specific overview
        if (primaryRole === "driver") return <DriverOverview />;
        if (primaryRole === "provider") return <ProviderOverview />;
        if (primaryRole === "seller") return <SellerOverview />;
        return <BuyerOverview />;

      case "orders":
        return (
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>Toutes les commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable />
            </CardContent>
          </Card>
        );

      case "products":
        return <ProductsList />;

      case "services":
        return <ServicesList />;

      case "milestones":
        return <ServiceMilestones />;

      case "delivery":
        return (
          <div className="space-y-6">
            <DeliveryTracking />
          </div>
        );

      case "map":
        return (
          <Card className="border-0 shadow-card">
            <CardContent className="p-0">
              <DeliveryMap
                orderId="live"
                deliveryRequestId={null}
                origin={{ lat: 6.1319, lng: 1.2228 }}
                destination={{ lat: 6.1725, lng: 1.2314 }}
                deliveryStatus="in_transit"
                estimatedTime="25 min"
                trackingNumber="MYS-LIVE"
                enableRealtime={true}
              />
            </CardContent>
          </Card>
        );

      case "notifications":
        return <NotificationsList />;

      default:
        return <BuyerOverview />;
    }
  };

  const greetingName = profile?.full_name?.split(" ")[0] || "Utilisateur";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Tableau de bord" description="Gérez votre activité sur MIYASHI" canonical="/dashboard" />
      <Header />

      <div className="flex-1 flex pt-[65px]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            userRoles={userRoles}
            collapsed={sidebarCollapsed}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative z-10">
              <DashboardSidebar
                activeTab={activeTab}
                onTabChange={(tab) => { setActiveTab(tab); setMobileSidebarOpen(false); }}
                userRoles={userRoles}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Top Bar */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                    {greeting}, {greetingName} 👋
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Voici un résumé de votre activité
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => navigate("/messages")}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Messages
                </Button>
                <Button size="sm" className="bg-primary" onClick={() => navigate("/create")}>
                  <Plus className="h-4 w-4 mr-1" /> Créer
                </Button>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
