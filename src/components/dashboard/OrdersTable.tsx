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
import { MoreHorizontal, Truck, CheckCircle, XCircle, FileText, KeyRound, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
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
  payment_mode?: string;
  fulfillment_method?: string;
  variant_label?: string | null;
  created_at: string;
  product?: { title: string };
  service?: { title: string };
}

interface OrdersTableProps {
  limit?: number;
  /** Show the orders of this seller (shop owner) — used by team members. */
  sellerId?: string;
}

const OrdersTable = ({ limit, sellerId }: OrdersTableProps) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [handover, setHandover] = useState<Order | null>(null);
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, sellerId]);

  const fetchOrders = async () => {
    if (!user) return;

    let query = supabase
      .from("orders")
      .select(`
        *,
        product:products(title),
        service:services(title)
      `)
      .or(sellerId ? `seller_id.eq.${sellerId}` : `seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (!error && data) {
      setOrders(data as Order[]);
      const { data: c } = await supabase.from("order_codes").select("order_id, code, used_at").eq("buyer_id", user.id);
      setCodes(Object.fromEntries((c ?? []).filter((x) => !x.used_at).map((x) => [x.order_id, x.code])));
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } else {
      toast.success("Statut mis à jour");
      fetchOrders();
    }
  };

  const submitHandover = async () => {
    if (!handover) return;
    const { data, error } = await supabase.rpc("confirm_handover", { p_order_id: handover.id, p_code: codeInput.trim() });
    const res = data as { success: boolean; error?: string; attempts_left?: number } | null;
    if (error || !res?.success) {
      toast.error(error?.message ?? `${res?.error ?? "Code incorrect"}${res?.attempts_left != null ? ` (${res.attempts_left} essais restants)` : ""}`);
      return;
    }
    toast.success(handover.payment_mode === "cod" ? "Paiement à la livraison encaissé, commande terminée" : "Remise confirmée");
    setHandover(null); setCodeInput(""); fetchOrders();
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
                {order.variant_label && <span className="block text-xs text-muted-foreground">{order.variant_label}</span>}
                {order.payment_mode === "cod" && <Badge variant="outline" className="mt-1 text-[10px]">À payer à la livraison</Badge>}
                {order.buyer_id === user?.id && codes[order.id] && !["completed", "cancelled"].includes(order.status) && (
                  <span className="block text-xs mt-1">Code de remise : <strong className="font-mono tracking-widest text-primary">{codes[order.id]}</strong></span>
                )}
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
                    {order.payment_status === "paid" && (
                      <DropdownMenuItem asChild>
                        <Link to={`/invoice/${order.id}`}><FileText className="mr-2 h-4 w-4" />Facture PDF</Link>
                      </DropdownMenuItem>
                    )}
                    {order.seller_id === (sellerId ?? user?.id) && !["completed", "cancelled"].includes(order.status) && (
                      <>
                        {order.product_id && (
                          <DropdownMenuItem onClick={() => setHandover(order)}>
                            {order.payment_mode === "cod" ? <Banknote className="mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
                            {order.payment_mode === "cod" ? "Encaisser (code client)" : "Remise en main propre (code)"}
                          </DropdownMenuItem>
                        )}
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
                          Annuler (client remboursé)
                        </DropdownMenuItem>
                      </>
                    )}
                    {order.buyer_id === user?.id && order.status === "pending" && (
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "cancelled")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Annuler (remboursé)
                      </DropdownMenuItem>
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
      <Dialog open={!!handover} onOpenChange={(o) => !o && setHandover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{handover?.payment_mode === "cod" ? "Encaisser le paiement à la livraison" : "Confirmer la remise"}</DialogTitle>
            <DialogDescription>Demandez au client son code à 6 chiffres. {handover?.payment_mode === "cod" ? `Encaissez ${handover?.total_price.toLocaleString("fr-FR")} FCFA en espèces : la commission MIYASHI (10 %) sera retenue sur votre portefeuille.` : "Le client confirmera ensuite la réception pour libérer le paiement."}</DialogDescription>
          </DialogHeader>
          <Input inputMode="numeric" maxLength={6} value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="text-center text-2xl tracking-[0.5em] font-mono h-14" aria-label="Code de remise" />
          <DialogFooter><Button onClick={submitHandover} disabled={codeInput.length !== 6}>Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersTable;
