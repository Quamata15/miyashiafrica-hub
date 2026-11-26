import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Milestone {
  id: string;
  order_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  order_index: number;
}

interface OrderWithMilestones {
  id: string;
  service?: { title: string };
  milestones: Milestone[];
}

const ServiceMilestones = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchOrdersWithMilestones();
    }
  }, [user]);

  const fetchOrdersWithMilestones = async () => {
    if (!user) return;

    // Fetch orders with services
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        service:services(title)
      `)
      .eq("seller_id", user.id)
      .not("service_id", "is", null)
      .not("status", "eq", "completed")
      .order("created_at", { ascending: false })
      .limit(10);

    if (ordersError || !ordersData) {
      setLoading(false);
      return;
    }

    // Fetch milestones for each order
    const ordersWithMilestones = await Promise.all(
      ordersData.map(async (order) => {
        const { data: milestones } = await supabase
          .from("service_milestones")
          .select("*")
          .eq("order_id", order.id)
          .order("order_index", { ascending: true });

        return {
          ...order,
          milestones: milestones || []
        };
      })
    );

    setOrders(ordersWithMilestones);
    setLoading(false);
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const updateMilestoneStatus = async (milestoneId: string, status: string) => {
    const updates: { status: string; completed_at?: string | null } = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    const { error } = await supabase
      .from("service_milestones")
      .update(updates)
      .eq("id", milestoneId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Étape mise à jour");
      fetchOrdersWithMilestones();
    }
  };

  const getProgress = (milestones: Milestone[]) => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.status === "completed").length;
    return Math.round((completed / milestones.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Étapes des prestations
        </CardTitle>
        <CardDescription>Suivez l'avancement de vos services</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune prestation en cours</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {orders.map((order) => {
                const progress = getProgress(order.milestones);
                const isExpanded = expandedOrders.has(order.id);

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleOrder(order.id)}
                    >
                      <div>
                        <p className="font-medium">
                          {order.service?.title || "Service"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          #{order.id.slice(0, 8)} • {order.milestones.length} étapes
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{progress}%</p>
                          <Progress value={progress} className="w-24 h-2" />
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t space-y-3"
                        >
                          {order.milestones.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Aucune étape définie
                            </p>
                          ) : (
                            order.milestones.map((milestone, index) => (
                              <div 
                                key={milestone.id}
                                className={`flex items-start gap-3 p-3 rounded-lg ${
                                  milestone.status === "completed" 
                                    ? "bg-green-500/10 dark:bg-green-950/20" 
                                    : "bg-muted/50"
                                }`}
                              >
                                <div className="mt-0.5">
                                  {getStatusIcon(milestone.status || "pending")}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className={`font-medium ${
                                      milestone.status === "completed" 
                                        ? "line-through text-muted-foreground" 
                                        : ""
                                    }`}>
                                      {index + 1}. {milestone.title}
                                    </p>
                                    <Badge variant={
                                      milestone.status === "completed" ? "default" :
                                      milestone.status === "in_progress" ? "secondary" : "outline"
                                    }>
                                      {milestone.status === "completed" ? "Terminé" :
                                       milestone.status === "in_progress" ? "En cours" : "À faire"}
                                    </Badge>
                                  </div>
                                  {milestone.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {milestone.description}
                                    </p>
                                  )}
                                  {milestone.due_date && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Échéance: {format(new Date(milestone.due_date), "dd MMM yyyy", { locale: fr })}
                                    </p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    {milestone.status !== "completed" && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => updateMilestoneStatus(milestone.id, "in_progress")}
                                        >
                                          En cours
                                        </Button>
                                        <Button 
                                          size="sm"
                                          onClick={() => updateMilestoneStatus(milestone.id, "completed")}
                                        >
                                          Terminer
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceMilestones;
