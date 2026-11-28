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
  const [form, setForm] = useState({ name: "", type: "discount", discount_type: "percentage", discount_value: 10, min_quantity: 1, start_date: "", end_date: "", event_tag: "", target_id: "" });
  const [myProducts, setMyProducts] = useState<{ id: string; title: string }[]>([]);
  const [country, setCountry] = useState("TG");

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
      supabase.from("shops").select("country").eq("owner_id", user.id).maybeSingle().then(({ data }) => data?.country && setCountry(data.country));
      supabase.from("products").select("id, title").eq("seller_id", user.id).eq("is_active", true).order("title").then(({ data }) => setMyProducts(data ?? []));
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
      min_quantity: form.type === "bulk" ? form.min_quantity : 1,
      start_date: form.start_date ? new Date(`${form.start_date}T00:00:00`).toISOString() : new Date().toISOString(),
      end_date: new Date(`${form.end_date}T23:59:59`).toISOString(),
      event_tag: form.event_tag || null,
      target_id: form.target_id || null,
      is_active: true,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message.includes("check") ? "Vérifiez la remise (90 % maximum) et les dates" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Promotion créée! 🎉" });
      setDialogOpen(false);
      setForm({ name: "", type: "discount", discount_type: "percentage", discount_value: 10, min_quantity: 1, start_date: "", end_date: "", event_tag: "", target_id: "" });
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

  // Ready-made campaigns: dates of the next occurrence (independence day of the seller's country).
  const presets = (() => {
    const now = new Date(); const y = now.getFullYear();
    const d = (yy: number, m: number, day: number) => new Date(yy, m, day);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const next = (m: number, day: number, before: number, after = 0) => {
      let e = d(y, m, day + after); if (e < now) e = d(y + 1, m, day + after);
      const st = new Date(e); st.setDate(e.getDate() - before - after);
      return { start: iso(st < now ? now : st), end: iso(e) };
    };
    const lastFriNov = (yy: number) => { const x = d(yy, 10, 30); while (x.getDay() !== 5) x.setDate(x.getDate() - 1); return x; };
    let bf = lastFriNov(y); if (d(bf.getFullYear(), bf.getMonth(), bf.getDate() + 3) < now) bf = lastFriNov(y + 1);
    const bfEnd = new Date(bf); bfEnd.setDate(bf.getDate() + 3);
    const indep: Record<string, [number, number]> = { TG: [3, 27], BJ: [7, 1], CI: [7, 7], SN: [3, 4], BF: [7, 5], ML: [8, 22], NE: [7, 3], GN: [9, 2], CM: [4, 20], GA: [7, 17], CG: [7, 15], TD: [7, 11], CF: [7, 13], GH: [2, 6], NG: [9, 1] };
    const [im, id] = indep[(country || "TG").toUpperCase()] ?? indep.TG;
    return [
      { label: "🏷️ Black Friday", tag: "black_friday", name: "Black Friday", value: 20, ...{ start: iso(bf < now ? now : bf), end: iso(bfEnd) } },
      { label: "🎄 Noël", tag: "noel", name: "Soldes de Noël", value: 15, ...next(11, 25, 14) },
      { label: "🎆 Fin d'année", tag: "fin_annee", name: "Soldes de fin d'année", value: 20, ...next(0, 1, 6, 6) },
      { label: "🎉 Indépendance", tag: "independance", name: "Fête de l'indépendance", value: 10, ...next(im, id, 6, 1) },
      { label: "📚 Rentrée", tag: "rentree", name: "Rentrée scolaire", value: 10, ...next(8, 30, 29) },
      { label: "💝 Saint-Valentin", tag: "saint_valentin", name: "Saint-Valentin", value: 10, ...next(1, 14, 7) },
    ];
  })();

  const eventTags = [
    { value: "fin_annee", label: "🎆 Fin d'année" },
    { value: "saint_valentin", label: "💝 Saint-Valentin" },
    { value: "noel", label: "🎄 Noël" },
    { value: "rentree", label: "📚 Rentrée" },
    { value: "fete_mere", label: "💐 Fête des mères" },
    { value: "black_friday", label: "🏷️ Black Friday" },
    { value: "ramadan", label: "🌙 Ramadan" },
    { value: "independance", label: "🎉 Fête de l'indépendance" },
    { value: "custom", label: "✨ Personnalisé" },
  ];

  return (
    <div className="space-y-4">
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
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Campagnes prêtes (dates pré-remplies)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((p) => (
                        <button key={p.tag} type="button" onClick={() => setForm({ ...form, name: p.name, type: "seasonal", discount_type: "percentage", discount_value: p.value, event_tag: p.tag, start_date: p.start, end_date: p.end })}
                          className={`rounded-full border px-2.5 py-1 text-xs hover:border-primary ${form.event_tag === p.tag ? "border-primary bg-primary/10" : ""}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
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
                    <Label>Produit concerné</Label>
                    <Select value={form.target_id || "all"} onValueChange={(v) => setForm({ ...form, target_id: v === "all" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toute la boutique</SelectItem>
                        {myProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="promo-start">Début</Label>
                      <Input id="promo-start" type="date" value={form.start_date} min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="promo-end">Fin</Label>
                      <Input id="promo-end" type="date" value={form.end_date} min={form.start_date || new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Sans date de début, la promotion commence tout de suite. Un compte à rebours s'affiche sur vos fiches, et le prix remisé est celui payé par l'acheteur.</p>

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
              <CardContent className="p-6 text-center">
                <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-3">Aucune promotion active</p>
                <p className="text-sm text-muted-foreground">Créez votre première promotion pour attirer plus de clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
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
                        {new Date(promo.end_date) <= new Date() ? "Expirée" : !promo.is_active ? "En pause" : new Date(promo.start_date) > new Date() ? `Programmée (${format(new Date(promo.start_date), "dd MMM", { locale: fr })})` : "Active"}
                      </Badge>
                      {promo.target_id && <Badge variant="outline" className="text-xs">{myProducts.find((p) => p.id === promo.target_id)?.title ?? "1 produit"}</Badge>}
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
                        {format(new Date(promo.start_date), "dd MMM", { locale: fr })} → {format(new Date(promo.end_date), "dd MMM yyyy", { locale: fr })}
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
              <CardContent className="p-6 text-center">
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
