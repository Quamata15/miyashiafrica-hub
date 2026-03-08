import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, ShoppingCart, Star, TrendingUp, Plus, Eye, Clock } from "lucide-react";
import QuickStatsGrid from "./QuickStatsGrid";
import SalesChart from "./SalesChart";

const SellerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [prodRes, ordRes, revRes] = await Promise.all([
      supabase.from("products").select("*").eq("seller_id", user.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("orders").select("*, product:products(title)").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("reviews").select("rating").eq("reviewed_user_id", user.id),
    ]);
    if (prodRes.data) setProducts(prodRes.data);
    if (ordRes.data) setOrders(ordRes.data);
    if (revRes.data) setReviews(revRes.data);
    setLoading(false);
  };

  const revenue = orders.reduce((s, o) => s + Number(o.total_price), 0);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const pending = orders.filter(o => o.status === "pending").length;

  const stats = [
    { label: "Produits actifs", value: products.length, icon: Package, onClick: () => navigate("/dashboard") },
    { label: "Revenus", value: `${revenue.toLocaleString()}F`, icon: DollarSign, trend: "up" as const, trendValue: "ce mois" },
    { label: "En attente", value: pending, icon: Clock, trend: pending > 0 ? "up" as const : "neutral" as const, trendValue: pending > 0 ? `${pending}` : "" },
    { label: "Note moyenne", value: avgRating, icon: Star },
  ];

  return (
    <div className="space-y-6">
      <QuickStatsGrid stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />

        {/* Top Products */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mes produits</CardTitle>
              <Button size="sm" onClick={() => navigate("/create")} className="bg-primary">
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun produit</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/create")}>
                  Créer votre premier produit
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.stock ?? 0}</p>
                    </div>
                    <p className="font-semibold text-sm">{Number(product.price).toLocaleString()}F</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOverview;
