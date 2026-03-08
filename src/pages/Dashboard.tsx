import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import BuyerOverview from "@/components/dashboard/BuyerOverview";
import SellerOverview from "@/components/dashboard/SellerOverview";
import ProviderOverview from "@/components/dashboard/ProviderOverview";
import DriverOverview from "@/components/dashboard/DriverOverview";
import FreelanceOverview from "@/components/dashboard/FreelanceOverview";
import EmployerOverview from "@/components/dashboard/EmployerOverview";
import OrdersTable from "@/components/dashboard/OrdersTable";
import ProductsList from "@/components/dashboard/ProductsList";
import ServicesList from "@/components/dashboard/ServicesList";
import DeliveryTracking from "@/components/dashboard/DeliveryTracking";
import ServiceMilestones from "@/components/dashboard/ServiceMilestones";
import NotificationsList from "@/components/dashboard/NotificationsList";
import PromotionsManager from "@/components/dashboard/PromotionsManager";
import BoostAnalytics from "@/components/dashboard/BoostAnalytics";
import DeliveryMap from "@/components/map/DeliveryMap";
import SellerOnboarding from "@/components/dashboard/SellerOnboarding";
import ProviderOnboarding from "@/components/dashboard/ProviderOnboarding";
import BuyerOnboarding from "@/components/dashboard/BuyerOnboarding";
import FreelanceOnboarding from "@/components/dashboard/FreelanceOnboarding";
import EmployerOnboarding from "@/components/dashboard/EmployerOnboarding";
import DriverOnboarding from "@/components/dashboard/DriverOnboarding";
import EmailVerificationBanner from "@/components/dashboard/EmailVerificationBanner";
import LowStockAlert from "@/components/dashboard/LowStockAlert";
import DriverDeliveryHistory from "@/components/dashboard/DriverDeliveryHistory";
import ExportCenter from "@/components/dashboard/ExportCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Plus, MessageSquare } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { preferences, updatePreference } = useUserPreferences();
  const [activeTab, setActiveTab] = useState("overview");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("dashboard-sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) fetchUserData();
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

  const primaryRole = useMemo(() => {
    if (userRoles.includes("driver")) return "driver";
    if (userRoles.includes("employer")) return "employer";
    if (userRoles.includes("freelance")) return "freelance";
    if (userRoles.includes("provider")) return "provider";
    if (userRoles.includes("seller")) return "seller";
    return "buyer";
  }, [userRoles]);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        if (primaryRole === "driver") return <DriverOverview />;
        if (primaryRole === "employer") return <EmployerOverview />;
        if (primaryRole === "freelance") return <FreelanceOverview />;
        if (primaryRole === "provider") return <ProviderOverview />;
        if (primaryRole === "seller") return <SellerOverview />;
        return <BuyerOverview />;
      case "orders":
        return (
          <Card className="border-0 shadow-card">
            <CardHeader><CardTitle>Toutes les commandes</CardTitle></CardHeader>
            <CardContent><OrdersTable /></CardContent>
          </Card>
        );
      case "products":
        return <ProductsList />;
      case "services":
        return <ServicesList />;
      case "milestones":
        return <ServiceMilestones />;
      case "promotions":
        return <PromotionsManager />;
      case "boosts":
        return <BoostAnalytics />;
      case "delivery":
        return <div className="space-y-6"><DeliveryTracking /></div>;
      case "history":
        return <DriverDeliveryHistory />;
      case "map":
        return (
          <Card className="border-0 shadow-card">
            <CardContent className="p-0">
              <DeliveryMap orderId="live" deliveryRequestId={null}
                origin={{ lat: 6.1319, lng: 1.2228 }} destination={{ lat: 6.1725, lng: 1.2314 }}
                deliveryStatus="in_transit" estimatedTime="25 min" trackingNumber="MYS-LIVE" enableRealtime={true} />
            </CardContent>
          </Card>
        );
      case "notifications":
        return <NotificationsList />;
      case "exports":
        return <ExportCenter />;
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
        <div className="hidden lg:flex relative">
          <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} userRoles={userRoles} collapsed={sidebarCollapsed} />
          <button
            onClick={() => {
              const next = !sidebarCollapsed;
              setSidebarCollapsed(next);
              try { localStorage.setItem("dashboard-sidebar-collapsed", String(next)); } catch {}
            }}
            className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md text-xs hover:scale-110 transition-transform"
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative z-10">
              <DashboardSidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setMobileSidebarOpen(false); }} userRoles={userRoles} />
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{greeting}, {greetingName} 👋</h1>
                  <p className="text-sm text-muted-foreground">Voici un résumé de votre activité</p>
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

            {/* Email verification reminder */}
            {user && !user.email_confirmed_at && user.email && (
              <EmailVerificationBanner email={user.email} />
            )}

            {/* Low stock alert for sellers */}
            {activeTab === "overview" && (primaryRole === "seller") && <LowStockAlert />}

            {/* Onboarding tutorials */}
            {activeTab === "overview" && primaryRole === "buyer" && !preferences.dismissed_buyer_onboarding && (
              <BuyerOnboarding onDismiss={() => updatePreference("dismissed_buyer_onboarding", true)} />
            )}
            {activeTab === "overview" && primaryRole === "seller" && !preferences.dismissed_seller_onboarding && (
              <SellerOnboarding onDismiss={() => updatePreference("dismissed_seller_onboarding", true)} />
            )}
            {activeTab === "overview" && primaryRole === "provider" && !preferences.dismissed_provider_onboarding && (
              <ProviderOnboarding onDismiss={() => updatePreference("dismissed_provider_onboarding", true)} />
            )}
            {activeTab === "overview" && primaryRole === "freelance" && !preferences.dismissed_freelance_onboarding && (
              <FreelanceOnboarding onDismiss={() => updatePreference("dismissed_freelance_onboarding", true)} />
            )}
            {activeTab === "overview" && primaryRole === "employer" && !preferences.dismissed_employer_onboarding && (
              <EmployerOnboarding onDismiss={() => updatePreference("dismissed_employer_onboarding", true)} />
            )}
            {activeTab === "overview" && primaryRole === "driver" && !preferences.dismissed_driver_onboarding && (
              <DriverOnboarding onDismiss={() => updatePreference("dismissed_driver_onboarding", true)} />
            )}

            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
