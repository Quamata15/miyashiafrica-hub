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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Promotions & Campagnes</h2>
          <p className="text-sm text-muted-foreground">Gérez vos offres spéciales et campagnes saisonnières</p>
        </div>
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

      {/* Active Promotions */}
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
    </div>
  );
};

export default PromotionsManager;
