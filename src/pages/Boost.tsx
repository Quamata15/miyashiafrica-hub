import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Zap, MapPin, Clock, Loader2, CheckCircle, Package, Wrench, Search, Target, TrendingUp, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const periods = [
  { id: "weekly", label: "1 semaine", price: 2500, days: 7 },
  { id: "monthly", label: "1 mois", price: 5000, days: 30 },
  { id: "quarterly", label: "3 mois", price: 10000, days: 90, popular: true },
  { id: "semi_annual", label: "6 mois", price: 15000, days: 180 },
  { id: "annual", label: "12 mois", price: 25000, days: 365 },
];

const Boost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "product";
  const initialTargetId = searchParams.get("target") || "";

  const [boostType, setBoostType] = useState(initialType);
  const [period, setPeriod] = useState("monthly");
  const [radius, setRadius] = useState([50]);
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [step, setStep] = useState(initialTargetId ? 2 : 1);

  const selectedPeriod = periods.find(p => p.id === period)!;
  const dailyCost = Math.round(selectedPeriod.price / selectedPeriod.days);

  // Load user's items
  useEffect(() => {
    if (user && step === 1) {
      loadItems();
      loadCampaigns();
    }
  }, [user, boostType, step]);

  const loadItems = async () => {
    if (!user) return;
    setLoadingItems(true);
    if (boostType === "product") {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, images, stock")
        .eq("seller_id", user.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      setItems(data || []);
    } else {
      const { data } = await supabase
        .from("services")
        .select("id, title, price, images")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setItems(data || []);
    }
    setLoadingItems(false);
  };

  const loadCampaigns = async () => {
    if (!user) return;
    const { data } = await (supabase.from("campaigns") as any)
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["draft", "active"])
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const filteredItems = items.filter(item =>
    !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === targetId);

  const handleBoost = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!targetId) {
      toast({ title: "Erreur", description: "Sélectionnez un élément à booster", variant: "destructive" });
      return;
    }
    setLoading(true);

    const expiresAt = new Date();
    switch (period) {
      case "weekly": expiresAt.setDate(expiresAt.getDate() + 7); break;
      case "monthly": expiresAt.setMonth(expiresAt.getMonth() + 1); break;
      case "quarterly": expiresAt.setMonth(expiresAt.getMonth() + 3); break;
      case "semi_annual": expiresAt.setMonth(expiresAt.getMonth() + 6); break;
      case "annual": expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
    }

    const boostData: any = {
      user_id: user.id,
      boost_type: boostType,
      target_id: targetId,
      zone_radius_km: radius[0],
      period,
      price_paid: selectedPeriod.price,
      expires_at: expiresAt.toISOString(),
    };
    if (selectedCampaign) boostData.campaign_id = selectedCampaign;

    const { data: boost, error } = await (supabase.from("boosts") as any)
      .insert(boostData)
      .select()
      .single();

    if (!error && boost) {
      // Update campaign budget spent
      if (selectedCampaign) {
        await (supabase.from("campaigns") as any)
          .update({ budget_spent: campaigns.find(c => c.id === selectedCampaign)?.budget_spent + selectedPeriod.price })
          .eq("id", selectedCampaign);
      }
    }

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le boost", variant: "destructive" });
    } else {
      toast({ title: "Boost activé! 🚀", description: `Votre ${boostType} est maintenant boosté pour ${selectedPeriod.label}` });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-hero flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold">Booster votre visibilité</h1>
              <p className="text-muted-foreground mt-2">Mettez en avant vos produits et services pour toucher plus de clients</p>
              
              {/* Steps indicator */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>{s}</div>
                    {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <span>Cible</span>
                <span>Paramètres</span>
                <span>Confirmer</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Select target */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {/* Type toggle */}
                  <Tabs value={boostType} onValueChange={v => { setBoostType(v); setTargetId(""); }}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="product" className="flex items-center gap-2">
                        <Package className="w-4 h-4" /> Produits
                      </TabsTrigger>
                      <TabsTrigger value="service" className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Services
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Card className="border-0 shadow-elevated mb-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Choisir l'élément à booster
                      </CardTitle>
                      <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingItems ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                          <p className="text-muted-foreground text-sm">
                            {items.length === 0
                              ? `Aucun ${boostType === "product" ? "produit" : "service"} trouvé. Créez-en un d'abord.`
                              : "Aucun résultat pour cette recherche"}
                          </p>
                          {items.length === 0 && (
                            <Button variant="outline" className="mt-3" onClick={() => navigate("/create")}>
                              Créer un {boostType === "product" ? "produit" : "service"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {filteredItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => setTargetId(item.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                                targetId === item.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                {item.images?.[0] ? (
                                  <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.price?.toLocaleString()} FCFA
                                  {item.stock !== undefined && ` · Stock: ${item.stock}`}
                                </p>
                              </div>
                              {targetId === item.id && (
                                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!targetId}
                    className="w-full h-12 bg-gradient-hero"
                  >
                    Continuer <span className="ml-2">→</span>
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Configure boost */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {/* Selected item preview */}
                  {selectedItem && (
                    <Card className="border-0 shadow-card mb-6 bg-primary/5 border-l-4 border-l-primary">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {selectedItem.images?.[0] ? (
                            <img src={selectedItem.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : <Package className="w-full h-full p-2 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{selectedItem.title}</p>
                          <p className="text-xs text-muted-foreground">{selectedItem.price?.toLocaleString()} FCFA</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Changer</Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Duration */}
                  <Card className="border-0 shadow-elevated mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Durée du boost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={period} onValueChange={setPeriod} className="space-y-3">
                        {periods.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              period === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={p.id} id={p.id} />
                              <label htmlFor={p.id} className="cursor-pointer font-medium flex items-center gap-2">
                                {p.label}
                                {p.popular && (
                                  <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">Populaire</Badge>
                                )}
                              </label>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary">{p.price.toLocaleString()} FCFA</span>
                              <p className="text-[10px] text-muted-foreground">{Math.round(p.price / p.days)} F/jour</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  {/* Zone */}
                  <Card className="border-0 shadow-card mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> Zone de couverture
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Slider value={radius} onValueChange={setRadius} min={10} max={500} step={10} />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">Rayon de visibilité</p>
                          <p className="text-lg font-bold text-primary">{radius[0]} km</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[25, 100, 300].map(r => (
                            <Button
                              key={r}
                              variant={radius[0] === r ? "default" : "outline"}
                              size="sm"
                              onClick={() => setRadius([r])}
                              className="text-xs"
                            >
                              {r} km
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Campaign (optional) */}
                  {campaigns.length > 0 && (
                    <Card className="border-0 shadow-card mb-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Megaphone className="w-5 h-5" /> Rattacher à une campagne
                          <Badge variant="outline" className="text-[10px]">Optionnel</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div
                            onClick={() => setSelectedCampaign(null)}
                            className={`p-3 rounded-xl border-2 cursor-pointer text-sm ${
                              !selectedCampaign ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            Aucune campagne
                          </div>
                          {campaigns.map(c => (
                            <div
                              key={c.id}
                              onClick={() => setSelectedCampaign(c.id)}
                              className={`p-3 rounded-xl border-2 cursor-pointer ${
                                selectedCampaign === c.id ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Budget: {Number(c.budget_spent).toLocaleString()}/{Number(c.budget_total).toLocaleString()} FCFA
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                      ← Retour
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-[2] h-12 bg-gradient-hero">
                      Continuer →
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="border-0 shadow-elevated mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" /> Récapitulatif
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedItem && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                            {selectedItem.images?.[0] ? (
                              <img src={selectedItem.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : <Package className="w-full h-full p-2 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{selectedItem.title}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{boostType}</Badge>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Durée</span>
                          <span className="font-medium">{selectedPeriod.label}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zone</span>
                          <span className="font-medium">{radius[0]} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coût journalier</span>
                          <span className="font-medium">{dailyCost} FCFA/jour</span>
                        </div>
                        {selectedCampaign && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Campagne</span>
                            <span className="font-medium">{campaigns.find(c => c.id === selectedCampaign)?.name}</span>
                          </div>
                        )}
                        <hr className="border-border" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg">Total</span>
                          <span className="font-bold text-2xl text-primary">{selectedPeriod.price.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      {/* Estimated impact */}
                      <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" /> Impact estimé
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-lg font-bold text-primary">
                              {(radius[0] * selectedPeriod.days * 3).toLocaleString()}+
                            </p>
                            <p className="text-[10px] text-muted-foreground">Vues estimées</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">
                              {Math.round(radius[0] * selectedPeriod.days * 0.15)}+
                            </p>
                            <p className="text-[10px] text-muted-foreground">Clics estimés</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">
                              x{(1 + radius[0] / 100).toFixed(1)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Visibilité</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-14">
                      ← Retour
                    </Button>
                    <Button
                      onClick={handleBoost}
                      disabled={loading}
                      className="flex-[2] h-14 text-lg bg-gradient-hero"
                    >
                      {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
                      Activer le boost
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Boost;
