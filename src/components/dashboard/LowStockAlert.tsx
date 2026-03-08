import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, X } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

const LowStockAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) fetchLowStock();
  }, [user]);

  const fetchLowStock = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("products")
      .select("id, title, stock")
      .eq("seller_id", user.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(5);
    if (data) setLowStockProducts(data);
  };

  if (dismissed || lowStockProducts.length === 0) return null;

  return (
    <Card className="border-0 shadow-card border-l-4 border-l-destructive mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-1">
                Stock bas ({lowStockProducts.length} produit{lowStockProducts.length > 1 ? "s" : ""})
              </h4>
              <div className="space-y-1">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{p.title}</span>
                    <span className="font-bold text-destructive">{p.stock ?? 0} restant{(p.stock ?? 0) > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => navigate("/dashboard")}>
                Gérer le stock →
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDismissed(true)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockAlert;
