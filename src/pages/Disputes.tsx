import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Loader2, Scale, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const reasons = [
  "Produit non reçu",
  "Produit endommagé",
  "Produit non conforme à la description",
  "Service non rendu",
  "Service de mauvaise qualité",
  "Livreur irrespectueux",
  "Retard de livraison excessif",
  "Problème de paiement",
  "Fraude suspectée",
  "Autre",
];

const Disputes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchDisputes();
    fetchOrders();
  }, [user]);

  const fetchDisputes = async () => {
    if (!user) return;
    const { data } = await (supabase.from("disputes") as any)
      .select("*")
      .or(`opened_by.eq.${user.id},against_user.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (data) setDisputes(data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase.from("orders").select("id, total_price, status, created_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(20);
    if (data) setOrders(data);
  };

  const submitDispute = async () => {
    if (!user || !orderId || !reason) return;
    setSubmitting(true);

    const order = orders.find(o => o.id === orderId);
    const { error } = await (supabase.from("disputes") as any).insert({
      order_id: orderId,
      opened_by: user.id,
      against_user: user.id, // Will be replaced by actual counterpart
      reason,
      description,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le litige", variant: "destructive" });
    } else {
      toast({ title: "Litige ouvert", description: "Notre équipe va examiner votre réclamation" });
      setShowNew(false);
      setReason("");
      setDescription("");
      setOrderId("");
      fetchDisputes();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                  <Scale className="w-8 h-8 text-primary" /> Litiges & Réclamations
                </h1>
                <p className="text-muted-foreground mt-1">Résolution de conflits entre acheteurs et vendeurs</p>
              </div>
              <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-hero"><Plus className="w-4 h-4 mr-2" /> Nouveau litige</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ouvrir un litige</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Commande concernée</Label>
                      <Select value={orderId} onValueChange={setOrderId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez une commande" /></SelectTrigger>
                        <SelectContent>
                          {orders.map(o => (
                            <SelectItem key={o.id} value={o.id}>
                              #{o.id.slice(0, 8)} - {o.total_price?.toLocaleString()}F ({o.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Motif</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger><SelectValue placeholder="Choisissez un motif" /></SelectTrigger>
                        <SelectContent>
                          {reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description détaillée</Label>
                      <Textarea placeholder="Décrivez le problème..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                    </div>
                    <Button onClick={submitDispute} disabled={submitting || !orderId || !reason} className="w-full bg-gradient-hero">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                      Soumettre le litige
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Policy Summary */}
            <Card className="border-0 shadow-card mb-6 bg-primary/5">
              <CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2"><FileText className="w-4 h-4" /> Politique de résolution</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Remboursement intégral si produit non reçu sous 14 jours</li>
                  <li>• Remboursement ou remplacement si produit endommagé (photos requises)</li>
                  <li>• Médiation gratuite par notre équipe sous 48h</li>
                  <li>• Les fonds restent bloqués en escrow pendant la résolution</li>
                  <li>• Décision finale par l'équipe MIYASHI en cas de désaccord</li>
                </ul>
              </CardContent>
            </Card>

            {/* Disputes List */}
            {loading ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : disputes.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12 text-center">
                  <Scale className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Aucun litige</p>
                  <p className="text-muted-foreground">Vous n'avez aucun litige en cours</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {disputes.map(d => (
                  <Card key={d.id} className="border-0 shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{d.reason}</p>
                          <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                        </div>
                        <Badge className={
                          d.status === "resolved" ? "bg-accent text-accent-foreground" :
                          d.status === "open" ? "bg-secondary text-secondary-foreground" :
                          "bg-muted text-muted-foreground"
                        }>{d.status === "open" ? "Ouvert" : d.status === "under_review" ? "En examen" : d.status === "resolved" ? "Résolu" : "Fermé"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Commande #{d.order_id?.slice(0, 8)}</span>
                        <span>{format(new Date(d.created_at), "dd MMM yyyy", { locale: fr })}</span>
                        {d.resolution && <Badge variant="outline">{d.resolution}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disputes;
