import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

interface Order {
  id: string;
  product_id: string | null;
  total_price: number;
  status: string;
  delivery_status: string;
  shipping_address: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  created_at: string;
  product?: { title: string };
}

const DeliveryTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`*, product:products(title)`)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .not("delivery_status", "eq", "delivered")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Package className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getDeliveryStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En préparation",
      processing: "En cours de traitement",
      shipped: "Expédié",
      in_transit: "En transit",
      out_for_delivery: "En livraison",
      delivered: "Livré",
    };
    return labels[status] || status;
  };

  const deliverySteps = [
    { key: "pending", label: "Commande reçue" },
    { key: "processing", label: "En préparation" },
    { key: "shipped", label: "Expédié" },
    { key: "in_transit", label: "En transit" },
    { key: "out_for_delivery", label: "En livraison" },
    { key: "delivered", label: "Livré" },
  ];

  const getCurrentStep = (status: string) => {
    return deliverySteps.findIndex(s => s.key === status);
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-[350px]">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune livraison en cours</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedOrder?.id === order.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedOrder(
                  selectedOrder?.id === order.id ? null : order
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeliveryStatusIcon(order.delivery_status || "pending")}
                    <span className="font-medium text-sm">
                      {order.product?.title || "Commande"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getDeliveryStatusLabel(order.delivery_status || "pending")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{order.id.slice(0, 8)}</span>
                  <span>{format(new Date(order.created_at), "dd MMM", { locale: fr })}</span>
                </div>

                {selectedOrder?.id === order.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t"
                  >
                    {/* Compact Progress Steps */}
                    <div className="flex items-center gap-1 mb-3">
                      {deliverySteps.map((step, index) => {
                        const currentStep = getCurrentStep(order.delivery_status || "pending");
                        const isCompleted = index <= currentStep;

                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className={`w-3 h-3 rounded-full ${
                              isCompleted ? 'bg-primary' : 'bg-muted'
                            }`} />
                            {index < deliverySteps.length - 1 && (
                              <div className={`flex-1 h-0.5 ${
                                index < currentStep ? 'bg-primary' : 'bg-muted'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {order.shipping_address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{order.shipping_address}</span>
                      </div>
                    )}

                    {order.estimated_delivery && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Livraison: {format(new Date(order.estimated_delivery), "dd MMM", { locale: fr })}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default DeliveryTracking;
