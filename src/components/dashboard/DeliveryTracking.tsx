import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight 
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Suivi des livraisons
        </CardTitle>
        <CardDescription>Suivez vos commandes en temps réel</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune livraison en cours</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
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
                      <span className="font-medium">
                        {order.product?.title || "Commande"}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {getDeliveryStatusLabel(order.delivery_status || "pending")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>#{order.id.slice(0, 8)}</span>
                    <span>{format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}</span>
                  </div>

                  {selectedOrder?.id === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t"
                    >
                      {/* Progress Steps */}
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                        {deliverySteps.map((step, index) => {
                          const currentStep = getCurrentStep(order.delivery_status || "pending");
                          const isCompleted = index <= currentStep;
                          const isCurrent = index === currentStep;

                          return (
                            <div key={step.key} className="relative flex items-center gap-4 pb-4">
                              <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs">{index + 1}</span>
                                )}
                              </div>
                              <div>
                                <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Delivery Info */}
                      {order.shipping_address && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>{order.shipping_address}</span>
                          </div>
                        </div>
                      )}

                      {order.tracking_number && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">N° de suivi: </span>
                          <span className="font-mono">{order.tracking_number}</span>
                        </div>
                      )}

                      {order.estimated_delivery && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Livraison estimée: {format(new Date(order.estimated_delivery), "dd MMMM yyyy", { locale: fr })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform mt-2 ${
                    selectedOrder?.id === order.id ? 'rotate-90' : ''
                  }`} />
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryTracking;
