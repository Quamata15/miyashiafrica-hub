import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Truck, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  service_id: string | null;
  quantity: number;
  total_price: number;
  status: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  product?: { title: string };
  service?: { title: string };
}

interface OrdersTableProps {
  limit?: number;
}

const OrdersTable = ({ limit }: OrdersTableProps) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    let query = supabase
      .from("orders")
      .select(`
        *,
        product:products(title),
        service:services(title)
      `)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Statut mis à jour");
      fetchOrders();
    }
  };

  // Buyer confirms reception → server-side escrow release via RPC
  const confirmReception = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc("confirm_order_reception", { p_order_id: orderId });
      if (error) throw error;

      toast.success("Réception confirmée! Les fonds ont été libérés ✅");
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la confirmation");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "secondary" },
      confirmed: { label: "Confirmé", variant: "default" },
      processing: { label: "En cours", variant: "default" },
      shipped: { label: "Expédié", variant: "default" },
      delivered: { label: "Livré", variant: "default" },
      completed: { label: "Terminé", variant: "default" },
      cancelled: { label: "Annulé", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune commande pour le moment
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commande</TableHead>
            <TableHead>Article</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">
                #{order.id.slice(0, 8)}
              </TableCell>
              <TableCell>
                {order.product?.title || order.service?.title || "N/A"}
              </TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell className="font-semibold">
                {order.total_price.toLocaleString()} FCFA
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell>
                {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    {order.seller_id === user?.id && (
                      <>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "confirmed")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirmer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "shipped")}>
                          <Truck className="mr-2 h-4 w-4" />
                          Marquer expédié
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "cancelled")}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Annuler
                        </DropdownMenuItem>
                      </>
                    )}
                    {order.buyer_id === user?.id && order.status === "shipped" && (
                      <DropdownMenuItem onClick={() => confirmReception(order.id)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-accent" />
                        ✅ Confirmer réception
                      </DropdownMenuItem>
                    )}
                    {order.buyer_id === user?.id && (
                      <DropdownMenuItem onClick={() => {
                        window.location.href = `/disputes`;
                      }}>
                        <XCircle className="mr-2 h-4 w-4 text-destructive" />
                        Ouvrir un litige
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrdersTable;
