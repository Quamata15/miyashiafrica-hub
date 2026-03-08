import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Percent, Tag, Calendar, Trash2, Megaphone, Gift, Copy, TicketPercent } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PromotionsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    type: "discount",
    discount_type: "percentage",
    discount_value: 10,
    min_quantity: 1,
    end_date: "",
    event_tag: "",
  });

  // Promo code form state
  const [codeForm, setCodeForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 0,
    max_uses: "",
    expires_at: "",
  });

  useEffect(() => {
    if (user) {
      fetchPromotions();
      fetchPromoCodes();
    }
  }, [user]);

  const fetchPromotions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setPromotions(data);
    setLoading(false);
  };

  const fetchPromoCodes = async () => {
    if (!user) return;
    const { data } = await (supabase.from("promo_codes") as any)
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setPromoCodes(data);
  };

  const handleCreate = async () => {
    if (!user || !form.name || !form.end_date) return;
    setSaving(true);

    const { error } = await supabase.from("promotions").insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_quantity: form.min_quantity,
      end_date: new Date(form.end_date).toISOString(),
      event_tag: form.event_tag || null,
      is_active: true,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la promotion", variant: "destructive" });
    } else {
      toast({ title: "Promotion créée! 🎉" });
      setDialogOpen(false);
      setForm({ name: "", type: "discount", discount_type: "percentage", discount_value: 10, min_quantity: 1, end_date: "", event_tag: "" });
      fetchPromotions();
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("promotions").update({ is_active: !currentActive }).eq("id", id);
    fetchPromotions();
  };

  const deletePromotion = async (id: string) => {
    await supabase.from("promotions").delete().eq("id", id);
    fetchPromotions();
    toast({ title: "Promotion supprimée" });
  };

  const handleCreateCode = async () => {
    if (!user || !codeForm.code || !codeForm.expires_at) return;
    setSaving(true);

    const { error } = await (supabase.from("promo_codes") as any).insert({
      seller_id: user.id,
      code: codeForm.code.toUpperCase(),
      discount_type: codeForm.discount_type,
      discount_value: codeForm.discount_value,
      min_order_amount: codeForm.min_order_amount || 0,
      max_uses: codeForm.max_uses ? parseInt(codeForm.max_uses) : null,
      expires_at: new Date(codeForm.expires_at).toISOString(),
      is_active: true,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message?.includes("unique") ? "Ce code existe déjà" : "Impossible de créer le code", variant: "destructive" });
    } else {
      toast({ title: "Code promo créé! 🎟️" });
      setCodeDialogOpen(false);
      setCodeForm({ code: "", discount_type: "percentage", discount_value: 10, min_order_amount: 0, max_uses: "", expires_at: "" });
      fetchPromoCodes();
    }
  };

  const deletePromoCode = async (id: string) => {
    await (supabase.from("promo_codes") as any).delete().eq("id", id);
    fetchPromoCodes();
    toast({ title: "Code supprimé" });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copié! 📋", description: `Code ${code} copié dans le presse-papier` });
  };

  const eventTags = [
    { value: "noel", label: "🎄 Noël" },
    { value: "rentree", label: "📚 Rentrée" },
    { value: "fete_mere", label: "💐 Fête des mères" },
    { value: "black_friday", label: "🏷️ Black Friday" },
    { value: "ramadan", label: "🌙 Ramadan" },
    { value: "independance", label: "🎉 Fête de l'indépendance" },
    { value: "custom", label: "✨ Personnalisé" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Promotions & Campagnes</h2>
        <p className="text-sm text-muted-foreground">Gérez vos offres spéciales, campagnes saisonnières et codes promo</p>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="promotions" className="flex items-center gap-1">
            <Megaphone className="w-4 h-4" /> Promotions
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex items-center gap-1">
            <TicketPercent className="w-4 h-4" /> Codes promo
          </TabsTrigger>
        </TabsList>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary">
                  <Plus className="w-4 h-4 mr-1" /> Nouvelle promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer une promotion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Nom de la promotion</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="ex: Soldes de Noël -20%"
                    />
                  </div>

                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Remise</SelectItem>
                        <SelectItem value="bulk">Remise sur quantité</SelectItem>
                        <SelectItem value="seasonal">Campagne saisonnière</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type de remise</Label>
                      <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                          <SelectItem value="fixed">Montant fixe (F)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valeur</Label>
                      <Input
                        type="number"
                        value={form.discount_value}
                        onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {form.type === "bulk" && (
                    <div>
                      <Label>Quantité minimum</Label>
                      <Input
                        type="number"
                        value={form.min_quantity}
                        onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })}
                        min={2}
                      />
                    </div>
                  )}

                  {(form.type === "seasonal" || form.type === "discount") && (
                    <div>
                      <Label>Événement / Occasion</Label>
                      <Select value={form.event_tag} onValueChange={(v) => setForm({ ...form, event_tag: v })}>
                        <SelectTrigger><SelectValue placeholder="Choisir (optionnel)" /></SelectTrigger>
                        <SelectContent>
                          {eventTags.map((e) => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleCreate} disabled={saving || !form.name || !form.end_date} className="w-full">
                    {saving ? "Création..." : "Créer la promotion"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Chargement...</div>
          ) : promotions.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-10 text-center">
                <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-3">Aucune promotion active</p>
                <p className="text-sm text-muted-foreground">Créez votre première promotion pour attirer plus de clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotions.map((promo) => (
                <Card key={promo.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          promo.type === "seasonal" ? "bg-accent/20" : promo.type === "bulk" ? "bg-secondary/20" : "bg-primary/10"
                        }`}>
                          {promo.type === "seasonal" ? <Gift className="w-5 h-5 text-accent-foreground" /> :
                           promo.type === "bulk" ? <Tag className="w-5 h-5 text-secondary" /> :
                           <Percent className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{promo.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {promo.discount_type === "percentage" ? `${promo.discount_value}%` : `${Number(promo.discount_value).toLocaleString()}F`} de remise
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={() => toggleActive(promo.id, promo.is_active)}
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant={promo.is_active && new Date(promo.end_date) > new Date() ? "default" : "outline"} className="text-xs">
                        {promo.is_active && new Date(promo.end_date) > new Date() ? "Active" : "Expirée"}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {promo.type === "discount" ? "Remise" : promo.type === "bulk" ? "Volume" : "Saisonnière"}
                      </Badge>
                      {promo.event_tag && (
                        <Badge variant="secondary" className="text-xs">
                          {eventTags.find(e => e.value === promo.event_tag)?.label || promo.event_tag}
                        </Badge>
                      )}
                      {promo.min_quantity > 1 && (
                        <Badge variant="outline" className="text-xs">Min: {promo.min_quantity}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Expire le {format(new Date(promo.end_date), "dd MMM yyyy", { locale: fr })}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deletePromotion(promo.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Promo Codes Tab */}
        <TabsContent value="codes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary">
                  <Plus className="w-4 h-4 mr-1" /> Nouveau code promo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer un code promo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Code</Label>
                    <Input
                      value={codeForm.code}
                      onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                      placeholder="ex: NOEL2026"
                      className="font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Les acheteurs saisiront ce code au checkout</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type de remise</Label>
                      <Select value={codeForm.discount_type} onValueChange={(v) => setCodeForm({ ...codeForm, discount_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                          <SelectItem value="fixed">Montant fixe (F)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valeur</Label>
                      <Input
                        type="number"
                        value={codeForm.discount_value}
                        onChange={(e) => setCodeForm({ ...codeForm, discount_value: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Commande minimum (FCFA)</Label>
                    <Input
                      type="number"
                      value={codeForm.min_order_amount}
                      onChange={(e) => setCodeForm({ ...codeForm, min_order_amount: Number(e.target.value) })}
                      placeholder="0 = pas de minimum"
                    />
                  </div>

                  <div>
                    <Label>Nombre d'utilisations max (optionnel)</Label>
                    <Input
                      type="number"
                      value={codeForm.max_uses}
                      onChange={(e) => setCodeForm({ ...codeForm, max_uses: e.target.value })}
                      placeholder="Illimité si vide"
                    />
                  </div>

                  <div>
                    <Label>Date d'expiration</Label>
                    <Input
                      type="date"
                      value={codeForm.expires_at}
                      onChange={(e) => setCodeForm({ ...codeForm, expires_at: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleCreateCode} disabled={saving || !codeForm.code || !codeForm.expires_at} className="w-full">
                    {saving ? "Création..." : "Créer le code promo"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {promoCodes.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-10 text-center">
                <TicketPercent className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-3">Aucun code promo</p>
                <p className="text-sm text-muted-foreground">Créez des codes promo que vos clients pourront utiliser au checkout</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((pc) => (
                <Card key={pc.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <TicketPercent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{pc.code}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(pc.code)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pc.discount_type === "percentage" ? `${pc.discount_value}%` : `${Number(pc.discount_value).toLocaleString()}F`} de remise
                            {pc.min_order_amount > 0 && ` • Min: ${Number(pc.min_order_amount).toLocaleString()}F`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant={pc.is_active && new Date(pc.expires_at) > new Date() ? "default" : "outline"} className="text-xs">
                            {pc.is_active && new Date(pc.expires_at) > new Date() ? "Actif" : "Expiré"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pc.used_count}{pc.max_uses ? `/${pc.max_uses}` : ""} utilisations
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deletePromoCode(pc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromotionsManager;
