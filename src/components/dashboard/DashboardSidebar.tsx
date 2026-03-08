import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, ShoppingCart, Package, Briefcase, Truck, Bell,
  User, Wallet, Star, MessageSquare, Shield, Plus, Settings,
  Home, Heart, TrendingUp, MapPin, Award, Users, Zap, Megaphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  value: string;
  badge?: number;
}

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRoles: string[];
  collapsed?: boolean;
}

const DashboardSidebar = ({ activeTab, onTabChange, userRoles, collapsed }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const mainItems: SidebarItem[] = [
    { label: "Vue d'ensemble", icon: BarChart3, value: "overview" },
    { label: "Commandes", icon: ShoppingCart, value: "orders" },
    { label: "Notifications", icon: Bell, value: "notifications", badge: unreadCount },
  ];

  const sellerItems: SidebarItem[] = userRoles.includes("seller") ? [
    { label: "Mes Produits", icon: Package, value: "products" },
    { label: "Promotions", icon: Megaphone, value: "promotions" },
    { label: "Boosts", icon: Zap, value: "boosts" },
  ] : [];

  const providerItems: SidebarItem[] = userRoles.includes("provider") ? [
    { label: "Mes Services", icon: Briefcase, value: "services" },
    { label: "Étapes prestations", icon: TrendingUp, value: "milestones" },
  ] : [];

  const deliveryItems: SidebarItem[] = userRoles.includes("driver") ? [
    { label: "Livraisons", icon: Truck, value: "delivery" },
    { label: "Carte GPS", icon: MapPin, value: "map" },
  ] : [];

  const quickActions = [
    { label: "Créer", icon: Plus, action: () => navigate("/create") },
    { label: "Messages", icon: MessageSquare, action: () => navigate("/messages") },
    { label: "Favoris", icon: Heart, action: () => navigate("/favorites") },
    { label: "Portefeuille", icon: Wallet, action: () => navigate("/wallet") },
  ];

  const allItems = [...mainItems, ...sellerItems, ...providerItems, ...deliveryItems];

  return (
    <aside className={cn(
      "bg-card border-r border-border flex flex-col h-full transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3", collapsed && "sr-only")}>
          Navigation
        </p>
        {allItems.map((item) => (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === item.value
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {item.badge && item.badge > 0 && (
              <Badge className={cn(
                "ml-auto text-xs h-5 min-w-5 flex items-center justify-center",
                activeTab === item.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                {item.badge}
              </Badge>
            )}
          </button>
        ))}

        {/* Quick Actions */}
        <div className="pt-4 mt-4 border-t border-border">
          <p className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3", collapsed && "sr-only")}>
            Actions rapides
          </p>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <action.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{action.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Roles indicator */}
      {!collapsed && userRoles.length > 0 && (
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Rôles actifs</p>
          <div className="flex flex-wrap gap-1">
            {userRoles.map((role) => (
              <Badge key={role} variant="outline" className="text-xs capitalize">
                {role === "buyer" ? "Acheteur" : role === "seller" ? "Vendeur" : role === "provider" ? "Prestataire" : role === "freelance" ? "Freelance" : role === "employer" ? "Recruteur" : role === "driver" ? "Livreur" : role}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

export default DashboardSidebar;
