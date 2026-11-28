import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { compressImage } from "@/lib/upload";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertTriangle, Plus, Loader2, Scale, FileText, Send, Clock,
  CheckCircle, XCircle, ArrowLeft, MessageSquare, Paperclip, Eye, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Ouvert", color: "bg-secondary text-secondary-foreground", icon: Clock },
  under_review: { label: "En examen", color: "bg-primary/10 text-primary", icon: Eye },
  resolved: { label: "Résolu", color: "bg-accent text-accent-foreground", icon: CheckCircle },
  closed: { label: "Fermé", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const Disputes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Form
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  // Coming from an order's "Ouvrir un litige": open the form directly.
  useEffect(() => { if (searchParams.get("order")) setShowNew(true); }, [searchParams]);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchDisputes();
    fetchOrders();
  }, [user]);

  // Realtime for dispute events
  useEffect(() => {
    if (!selectedDispute) return;
    const channel = supabase
      .channel(`dispute-events-${selectedDispute.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dispute_events",
        filter: `dispute_id=eq.${selectedDispute.id}`,
      }, (payload) => {
        setEvents(prev => [...prev, payload.new]);
        setTimeout(() => eventsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDispute?.id]);

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

  const fetchEvents = async (disputeId: string) => {
    setLoadingEvents(true);
    const { data } = await (supabase.from("dispute_events") as any)
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });
    setEvents(data || []);
    setLoadingEvents(false);
  };

  const openDispute = (dispute: any) => {
    setSelectedDispute(dispute);
    fetchEvents(dispute.id);
  };

  const submitDispute = async () => {
    if (!user || !orderId || !reason) return;
    setSubmitting(true);
    // Opened against the other party of the order; the payment stays blocked during mediation.
    const { error } = await supabase.rpc("open_dispute", { p_order_id: orderId, p_reason: reason, p_description: description || undefined });
    setSubmitting(false);
    if (error) {
      toast({ title: "Litige impossible", description: error.message.replace(/^.*?ERROR:\s*/i, ""), variant: "destructive" });
    } else {
      toast({ title: "Litige ouvert", description: "Notre équipe va examiner votre réclamation" });
      setShowNew(false);
      setReason(""); setDescription(""); setOrderId("");
      fetchDisputes();
    }
  };

  const [uploading, setUploading] = useState(false);
  const sendEvidence = async (file?: File) => {
    if (!user || !selectedDispute || !file) return;
    setUploading(true);
    try {
      const f = await compressImage(file, 1800, 0.85);
      const ext = f.type === "application/pdf" ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${selectedDispute.id}/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("dispute-evidence").upload(path, f, { contentType: f.type });
      if (error) throw error;
      await (supabase.from("dispute_events") as any).insert({ dispute_id: selectedDispute.id, user_id: user.id, event_type: "evidence", content: "Preuve ajoutée", attachment_url: path, attachment_name: file.name.slice(0, 120) });
      fetchEvents(selectedDispute.id);
      toast({ title: "Preuve ajoutée" });
    } catch (e) {
      toast({ title: "Envoi impossible", description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };
  const openEvidence = async (path: string) => {
    const { data } = await supabase.storage.from("dispute-evidence").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const sendMessage = async () => {
    if (!user || !selectedDispute || !newMessage.trim()) return;
    setSendingMessage(true);
    await (supabase.from("dispute_events") as any).insert({
      dispute_id: selectedDispute.id,
      user_id: user.id,
      event_type: "message",
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSendingMessage(false);
  };

  // Timeline view for selected dispute
  if (selectedDispute) {
    const status = statusConfig[selectedDispute.status] || statusConfig.open;
    const StatusIcon = status.icon;

    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-header pb-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDispute(null)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux litiges
              </Button>

              {/* Dispute header */}
              <Card className="border-0 shadow-elevated mb-6">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-display font-bold">{selectedDispute.reason}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commande #{selectedDispute.order_id?.slice(0, 8)} · Ouvert {formatDistanceToNow(new Date(selectedDispute.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  {selectedDispute.description && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl">{selectedDispute.description}</p>
                  )}

                  {/* Resolution info */}
                  {selectedDispute.resolution && (
                    <div className="mt-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent-foreground" /> Résolution
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{selectedDispute.resolution}</p>
                      {selectedDispute.refund_amount > 0 && (
                        <p className="text-sm font-bold text-primary mt-1">
                          Remboursement: {Number(selectedDispute.refund_amount).toLocaleString()} FCFA
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status timeline */}
              <Card className="border-0 shadow-card mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {["open", "under_review", "resolved"].map((s, i) => {
                      const sConfig = statusConfig[s];
                      const SIcon = sConfig.icon;
                      const statuses = ["open", "under_review", "resolved"];
                      const currentIdx = statuses.indexOf(selectedDispute.status);
                      const isActive = i <= currentIdx;
                      return (
                        <div key={s} className="flex items-center flex-1">
                          <div className={`flex flex-col items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground/40"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              <SIcon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-medium">{sConfig.label}</span>
                          </div>
                          {i < 2 && (
                            <div className={`flex-1 h-0.5 mx-2 ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Chat / Events timeline */}
              <Card className="border-0 shadow-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto mb-4 p-1">
                    {loadingEvents ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : events.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Aucun message. Commencez la discussion.
                      </div>
                    ) : (
                      events.map(evt => {
                        const isMe = evt.user_id === user?.id;
                        const isSystem = evt.event_type === "status_change" || evt.event_type === "admin_note";
                        
                        if (isSystem) {
                          return (
                            <div key={evt.id} className="flex justify-center">
                              <Badge variant="outline" className="text-xs gap-1">
                                <Shield className="w-3 h-3" />
                                {evt.content}
                              </Badge>
                            </div>
                          );
                        }

                        return (
                          <div key={evt.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] ${isMe ? "order-2" : ""}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              }`}>
                                {evt.content}
                                {evt.attachment_url && (
                                  <button type="button" onClick={() => openEvidence(evt.attachment_url)} className="mt-1 flex items-center gap-1 underline text-xs">
                                    <Paperclip className="w-3 h-3" />{evt.attachment_name || "Voir la pièce"}
                                  </button>
                                )}
                              </div>
                              <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? "text-right" : ""}`}>
                                {format(new Date(evt.created_at), "dd MMM HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={eventsEndRef} />
                  </div>

                  {/* Message input */}
                  {selectedDispute.status !== "closed" && selectedDispute.status !== "resolved" && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Écrivez un message..."
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        className="flex-1"
                      />
                      <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-foreground/10 hover:bg-muted" title="Ajouter une preuve (photo ou PDF)">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        <span className="sr-only">Ajouter une preuve</span>
                        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => sendEvidence(e.target.files?.[0])} />
                      </label>
                      <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()} size="icon">
                        {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                  <Scale className="w-6 h-6 shrink-0 text-primary" /> Litiges et réclamations
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">Résolution de conflits entre acheteurs et vendeurs</p>
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

            {/* Policy */}
            <Card className="border-0 shadow-card mb-3 bg-primary/5">
              <CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2"><FileText className="w-4 h-4" /> Politique de résolution</h3>
                <ul className="text-sm text-muted-foreground grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  <li>• Remboursement intégral si produit non reçu sous 14 jours</li>
                  <li>• Remboursement ou remplacement si produit endommagé (photos requises)</li>
                  <li>• Médiation gratuite par notre équipe sous 48h</li>
                  <li>• Les fonds restent bloqués en escrow pendant la résolution</li>
                </ul>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-xl font-bold">{disputes.filter(d => d.status === "open" || d.status === "under_review").length}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-xl font-bold text-accent-foreground">{disputes.filter(d => d.status === "resolved").length}</p>
                  <p className="text-xs text-muted-foreground">Résolus</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-xl font-bold">{disputes.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : disputes.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-6 sm:p-8 text-center">
                  <Scale className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-lg font-medium">Aucun litige</p>
                  <p className="text-muted-foreground">Vous n'avez aucun litige en cours</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {disputes.map(d => {
                  const s = statusConfig[d.status] || statusConfig.open;
                  const SIcon = s.icon;
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card
                        className="border-0 shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                        onClick={() => openDispute(d)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold">{d.reason}</p>
                              {d.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{d.description}</p>
                              )}
                            </div>
                            <Badge className={s.color}>
                              <SIcon className="w-3 h-3 mr-1" />{s.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Commande #{d.order_id?.slice(0, 8)}</span>
                            <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: fr })}</span>
                            {d.refund_amount > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                Remboursement: {Number(d.refund_amount).toLocaleString()}F
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
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
