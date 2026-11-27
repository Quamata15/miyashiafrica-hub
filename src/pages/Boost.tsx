import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Zap, MapPin, Clock, Loader2, CheckCircle, Package, Wrench, Search,
  Target, TrendingUp, Megaphone, User, Briefcase, ImagePlus, Video,
  X, Eye, MousePointer, ShoppingCart, ArrowLeft, Sparkles, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpaces, type Feature } from "@/hooks/useSpaces";

const boostTypes = [
  { id: "product", label: "Produit", icon: Package, desc: "Mettez un produit en avant dans le marketplace" },
  { id: "service", label: "Service", icon: Wrench, desc: "Boostez la visibilité d'un service" },
  { id: "profile", label: "Mon profil", icon: User, desc: "Mettez votre profil public en avant (boutique, prestataire, recruteur ou freelance)" },
  { id: "freelance", label: "Profil Freelance", icon: Briefcase, desc: "Apparaissez en tête des résultats freelance" },
  { id: "job", label: "Offre d'emploi", icon: Briefcase, desc: "Touchez plus de candidats qualifiés" },
];

const periods = [
  { id: "weekly", label: "1 semaine", price: 2500, days: 7 },
  { id: "monthly", label: "1 mois", price: 5000, days: 30 },
  { id: "quarterly", label: "3 mois", price: 10000, days: 90, popular: true },
  { id: "semi_annual", label: "6 mois", price: 15000, days: 180 },
  { id: "annual", label: "12 mois", price: 25000, days: 365 },
];

const BOOST_FEATURE: Record<string, Feature> = { product: "sell", service: "provide", profile: "boost", freelance: "apply", job: "recruit" };

const Boost = () => {
  const { user } = useAuth();
  const sp = useSpaces();
  // Only what the account's spaces can promote.
  const allowedTypes = boostTypes.filter((t) => sp.can(BOOST_FEATURE[t.id]));
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "";
  const initialTargetId = searchParams.get("target") || "";
  const initialCampaignId = searchParams.get("campaign") || "";

  const [boostType, setBoostType] = useState(initialType);
  const [period, setPeriod] = useState("monthly");
  const [radius, setRadius] = useState([50]);
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(initialCampaignId || null);
  const [step, setStep] = useState(initialType && initialTargetId ? 3 : initialType ? 2 : 1);

  // Creative media
  const [creativeUrl, setCreativeUrl] = useState<string | null>(null);
  const [creativeType, setCreativeType] = useState<"none" | "image" | "video">("none");
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const creativeInputRef = useRef<HTMLInputElement>(null);

  // Description
  const [boostDescription, setBoostDescription] = useState("");
  const [useCreative, setUseCreative] = useState(false);

  const selectedPeriod = periods.find(p => p.id === period)!;
  const dailyCost = Math.round(selectedPeriod.price / selectedPeriod.days);

  useEffect(() => {
    if (user && step === 2 && boostType) {
      loadItems();
    }
    if (user) loadCampaigns();
  }, [user, boostType, step]);

  const loadItems = async () => {
    if (!user) return;
    setLoadingItems(true);
    setItems([]);

    if (boostType === "product") {
      const { data } = await supabase
        .from("products").select("id, title, price, images, stock")
        .eq("seller_id", user.id).eq("is_active", true).is("deleted_at", null)
        .order("created_at", { ascending: false });
      setItems(data || []);
    } else if (boostType === "service") {
      const { data } = await supabase
        .from("services").select("id, title, price, images")
        .eq("provider_id", user.id).eq("is_active", true)
        .order("created_at", { ascending: false });
      setItems(data || []);
    } else if (boostType === "profile") {
      // Profile boost = boost the user's profile itself
      const { data } = await supabase
        .from("profiles").select("id, user_id, full_name, avatar_url, bio, location")
        .eq("user_id", user.id).single();
      if (data) setItems([{ id: data.user_id, title: data.full_name || "Mon profil", images: data.avatar_url ? [data.avatar_url] : [], subtitle: data.location || "Profil vendeur" }]);
    } else if (boostType === "freelance") {
      const { data } = await supabase
        .from("freelance_profiles").select("id, user_id, title, photo_url, hourly_rate, skills")
        .eq("user_id", user.id).single();
      if (data) setItems([{ id: data.id, title: data.title || "Profil freelance", images: data.photo_url ? [data.photo_url] : [], subtitle: data.skills?.slice(0, 3).join(", ") || "", price: data.hourly_rate }]);
    } else if (boostType === "job") {
      const { data } = await supabase
        .from("jobs").select("id, title, budget_min, budget_max, job_type")
        .eq("employer_id", user.id).eq("is_active", true)
        .order("created_at", { ascending: false });
      setItems((data || []).map(j => ({ ...j, subtitle: j.job_type, price: j.budget_max })));
    }

    setLoadingItems(false);
  };

  const loadCampaigns = async () => {
    if (!user) return;
    const { data } = await (supabase.from("campaigns") as any)
      .select("*").eq("user_id", user.id)
      .in("status", ["draft", "active"])
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const filteredItems = items.filter(item =>
    !searchQuery || item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === targetId);

  const handleCreativeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Fichier trop volumineux", description: isVideo ? "Max 50 Mo pour les vidéos" : "Max 10 Mo pour les images", variant: "destructive" });
      return;
    }

    setUploadingCreative(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/boosts-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("product-media").upload(path, file);
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploadingCreative(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-media").getPublicUrl(path);
    setCreativeUrl(urlData.publicUrl);
    setCreativeType(isVideo ? "video" : "image");
    setUploadingCreative(false);
  };

  const handleBoost = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!targetId && boostType !== "profile") {
      toast({ title: "Erreur", description: "Sélectionnez un élément à booster", variant: "destructive" });
      return;
    }
    setLoading(true);

    const p = periods.find(x => x.id === period)!;
    const { error } = await (supabase.rpc as any)("purchase_boost", {
      p_boost_type: boostType,
      p_target_id: targetId || user.id,
      p_target_name: selectedItem?.title || "Mon profil",
      p_zone_radius_km: radius[0],
      p_period: period,
      p_description: boostDescription || null,
      p_creative_url: useCreative ? creativeUrl : null,
      p_creative_type: useCreative ? creativeType : "none",
      p_campaign_id: selectedCampaign || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message?.includes("Insufficient") ? "Solde du portefeuille insuffisant" : "Impossible de créer le boost", variant: "destructive" });
    } else {
      toast({ title: "Boost activé! 🚀", description: `Votre ${boostTypes.find(t => t.id === boostType)?.label} est maintenant boosté pour ${p.label}` });
      navigate("/dashboard");
    }
  };

  const typeInfo = boostTypes.find(t => t.id === boostType);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-4">
              <div className="flex items-center gap-3 min-w-0 mr-auto">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-hero flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-display font-bold leading-tight">Booster votre visibilité</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Produits, services, profils, offres d'emploi</p>
                </div>
              </div>
              <ol className="flex items-start gap-1" aria-label="Étapes">
                {["Type", "Cible", "Réglages", "Confirmer"].map((label, i) => {
                  const s = i + 1;
                  return (
                    <li key={label} className="flex items-start gap-1" aria-current={step === s ? "step" : undefined}>
                      <div className="flex flex-col items-center w-14">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
                        <span className={`mt-1 text-[11px] ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                      </div>
                      {s < 4 && <div className={`mt-3.5 w-3 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} aria-hidden />}
                    </li>
                  );
                })}
              </ol>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Choose boost type */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="border-0 shadow-elevated mb-3">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Que souhaitez-vous booster ?</CardTitle>
                      <CardDescription>Choisissez le type de contenu à mettre en avant</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-2">
                      {allowedTypes.map(type => {
                        const Icon = type.icon;
                        return (
                          <button
                            type="button"
                            key={type.id}
                            onClick={() => { setBoostType(type.id); setTargetId(""); }}
                            aria-pressed={boostType === type.id}
                            className={`flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all border-2 ${
                              boostType === type.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-transparent hover:bg-muted/50 hover:border-muted"
                            }`}
                          >
                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                              boostType === type.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{type.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{type.desc}</p>
                            </div>
                            {boostType === type.id && <CheckCircle className="w-5 h-5 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!boostType}
                    className="w-full h-11 bg-gradient-hero"
                  >
                    Continuer →
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Select target */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Type
                    </Button>
                    {typeInfo && (
                      <Badge className="bg-primary/10 text-primary">
                        {typeInfo.label}
                      </Badge>
                    )}
                  </div>

                  <Card className="border-0 shadow-elevated mb-3">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        {boostType === "profile"
                          ? "Confirmer le profil à booster"
                          : `Choisir ${boostType === "job" ? "l'offre" : boostType === "freelance" ? "le profil" : boostType === "product" ? "le produit" : "le service"} à booster`}
                      </CardTitle>
                      {items.length > 3 && (
                        <div className="relative mt-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                        </div>
                      )}
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
                            {boostType === "profile"
                              ? "Complétez d'abord votre profil"
                              : boostType === "freelance"
                              ? "Créez d'abord votre profil freelance"
                              : `Aucun ${typeInfo?.label.toLowerCase()} trouvé`}
                          </p>
                          <Button variant="outline" className="mt-3" onClick={() => navigate("/create")}>
                            Créer du contenu
                          </Button>
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
                                    {boostType === "profile" ? <User className="w-5 h-5 text-muted-foreground" /> :
                                     boostType === "freelance" ? <Briefcase className="w-5 h-5 text-muted-foreground" /> :
                                     <Package className="w-5 h-5 text-muted-foreground" />}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.subtitle || (item.price ? `${item.price?.toLocaleString()} FCFA` : "")}
                                  {item.stock !== undefined ? ` · Stock: ${item.stock}` : ""}
                                </p>
                              </div>
                              {targetId === item.id && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => setStep(3)}
                    disabled={!targetId}
                    className="w-full h-11 bg-gradient-hero"
                  >
                    Continuer →
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Configure boost + creative */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Cible
                    </Button>
                    {selectedItem && (
                      <Badge variant="outline" className="text-xs truncate max-w-48">
                        {selectedItem.title}
                      </Badge>
                    )}
                  </div>

                  {/* Creative / Visual publicitaire */}
                  <Card className="border-0 shadow-elevated mb-3">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="w-5 h-5" /> Visuel publicitaire
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="use-creative" className="text-xs text-muted-foreground">Ajouter un visuel</Label>
                          <Switch id="use-creative" checked={useCreative} onCheckedChange={setUseCreative} />
                        </div>
                      </div>
                      <CardDescription>
                        Ajoutez une photo ou vidéo promotionnelle pour capter l'attention
                      </CardDescription>
                    </CardHeader>
                    {useCreative && (
                      <CardContent>
                        {creativeUrl ? (
                          <div className="relative rounded-xl overflow-hidden border-2 border-primary/20">
                            {creativeType === "video" ? (
                              <video src={creativeUrl} controls className="w-full max-h-48 object-contain bg-muted" />
                            ) : (
                              <img src={creativeUrl} alt="Visuel" className="w-full max-h-48 object-contain bg-muted" />
                            )}
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full"
                              onClick={() => { setCreativeUrl(null); setCreativeType("none"); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-2 left-2">
                              <Badge className="bg-background/80 text-foreground text-xs">
                                {creativeType === "video" ? "Vidéo" : "Image"}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => creativeInputRef.current?.click()}
                            disabled={uploadingCreative}
                            className="w-full h-36 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-all"
                          >
                            {uploadingCreative ? (
                              <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                              <>
                                <div className="flex gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                                    <ImagePlus className="w-6 h-6" />
                                  </div>
                                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                                    <Video className="w-6 h-6" />
                                  </div>
                                </div>
                                <span className="text-sm font-medium">Ajouter une photo ou vidéo</span>
                                <span className="text-xs">JPEG, PNG, WebP, MP4, WebM · Max 50 Mo</span>
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={creativeInputRef}
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          onChange={handleCreativeUpload}
                          className="hidden"
                        />
                      </CardContent>
                    )}
                  </Card>

                  {/* Description du boost */}
                  <Card className="border-0 shadow-card mb-3">
                    <CardHeader>
                      <CardTitle className="text-base">Message promotionnel</CardTitle>
                      <CardDescription>Optionnel — Un texte accrocheur pour accompagner votre boost</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={boostDescription}
                        onChange={e => setBoostDescription(e.target.value)}
                        placeholder="Ex: -20% cette semaine seulement ! Livraison gratuite sur Lomé..."
                        rows={3}
                        maxLength={280}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{boostDescription.length}/280</p>
                    </CardContent>
                  </Card>

                  {/* Duration */}
                  <Card className="border-0 shadow-elevated mb-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="w-5 h-5" /> Durée du boost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={period} onValueChange={setPeriod} className="space-y-2">
                        {periods.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              period === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={p.id} id={p.id} />
                              <label htmlFor={p.id} className="cursor-pointer font-medium text-sm flex items-center gap-2">
                                {p.label}
                                {p.popular && <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">Populaire</Badge>}
                              </label>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary text-sm">{p.price.toLocaleString()} FCFA</span>
                              <p className="text-[10px] text-muted-foreground">{Math.round(p.price / p.days)} F/jour</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  {/* Zone */}
                  <Card className="border-0 shadow-card mb-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="w-5 h-5" /> Zone de couverture
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Slider value={radius} onValueChange={setRadius} min={10} max={500} step={10} />
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-sm text-muted-foreground">Rayon de visibilité</p>
                        <p className="text-lg font-bold text-primary">{radius[0]} km</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[25, 100, 250, 500].map(r => (
                          <Button key={r} variant={radius[0] === r ? "default" : "outline"} size="sm" onClick={() => setRadius([r])} className="text-xs">
                            {r} km
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Campaign */}
                  {campaigns.length > 0 && (
                    <Card className="border-0 shadow-card mb-3">
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
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">← Retour</Button>
                    <Button onClick={() => setStep(4)} className="flex-[2] h-11 bg-gradient-hero">Continuer →</Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirm */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="border-0 shadow-elevated mb-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" /> Récapitulatif
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Target preview */}
                      {selectedItem && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                            {selectedItem.images?.[0] ? (
                              <img src={selectedItem.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{selectedItem.title}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{typeInfo?.label}</Badge>
                          </div>
                        </div>
                      )}

                      {/* Creative preview */}
                      {useCreative && creativeUrl && (
                        <div className="rounded-xl overflow-hidden border border-border">
                          {creativeType === "video" ? (
                            <video src={creativeUrl} className="w-full max-h-32 object-contain bg-muted" muted />
                          ) : (
                            <img src={creativeUrl} alt="" className="w-full max-h-32 object-contain bg-muted" />
                          )}
                          <div className="p-2 bg-muted/30 text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Visuel publicitaire
                          </div>
                        </div>
                      )}

                      {/* Description preview */}
                      {boostDescription && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <p className="text-sm italic">"{boostDescription}"</p>
                        </div>
                      )}

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium capitalize">{typeInfo?.label}</span>
                        </div>
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
                        {useCreative && creativeUrl && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Visuel</span>
                            <span className="font-medium">{creativeType === "video" ? "Vidéo" : "Image"} ✓</span>
                          </div>
                        )}
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
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" /> Impact estimé
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-lg font-bold text-primary">
                              {(radius[0] * selectedPeriod.days * 3).toLocaleString()}+
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                              <Eye className="w-3 h-3" /> Vues
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">
                              {Math.round(radius[0] * selectedPeriod.days * 0.15)}+
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                              <MousePointer className="w-3 h-3" /> Clics
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">
                              x{(1 + radius[0] / 100).toFixed(1)}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Visibilité
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-14">← Retour</Button>
                    <Button onClick={handleBoost} disabled={loading} className="flex-[2] h-14 text-lg bg-gradient-hero">
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
