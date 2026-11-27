import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Megaphone, Plus, Loader2, Calendar, TrendingUp, Zap, BarChart3,
  Play, Pause, Trash2, Target, Eye, MousePointer, Package, Wrench,
  User, Briefcase, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const objectiveOptions = [
  { value: "visibility", label: "Visibilité", desc: "Maximiser les impressions", icon: Eye },
  { value: "traffic", label: "Trafic", desc: "Générer des clics", icon: MousePointer },
  { value: "conversions", label: "Conversions", desc: "Générer des ventes", icon: TrendingUp },
  { value: "branding", label: "Notoriété", desc: "Renforcer votre image", icon: Target },
];

const typeIcons: Record<string, typeof Package> = {
  product: Package, service: Wrench, profile: User, freelance: Briefcase, job: Briefcase,
};

const Campaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [boostsByCampaign, setBoostsByCampaign] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", budget_total: "",
    start_date: "", end_date: "", objective: "visibility",
  });

  useEffect(() => {
    if (user) { fetchCampaigns(); fetchBoosts(); }
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await (supabase.from("campaigns") as any)
      .select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const fetchBoosts = async () => {
    if (!user) return;
    const { data } = await (supabase.from("boosts") as any)
      .select("*").eq("user_id", user.id)
      .not("campaign_id", "is", null)
      .order("created_at", { ascending: false });
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach((b: any) => {
        if (!grouped[b.campaign_id]) grouped[b.campaign_id] = [];
        grouped[b.campaign_id].push(b);
      });
      setBoostsByCampaign(grouped);
    }
  };

  const handleCreate = async () => {
    if (!user || !form.name || !form.budget_total) return;
    setCreating(true);
    const { error } = await (supabase.from("campaigns") as any).insert({
      user_id: user.id,
      name: form.name,
      description: form.description || null,
      budget_total: Number(form.budget_total),
      start_date: form.start_date || new Date().toISOString(),
      end_date: form.end_date || null,
      objective: form.objective,
      status: "active",
    });
    setCreating(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la campagne", variant: "destructive" });
    } else {
      toast({ title: "Campagne créée! 🎯" });
      setShowCreate(false);
      setForm({ name: "", description: "", budget_total: "", start_date: "", end_date: "", objective: "visibility" });
      fetchCampaigns();
    }
  };

  const toggleStatus = async (campaign: any) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await (supabase.from("campaigns") as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", campaign.id);
    fetchCampaigns();
    toast({ title: newStatus === "active" ? "Campagne relancée ▶" : "Campagne en pause ⏸" });
  };

  const deleteCampaign = async (id: string) => {
    await (supabase.from("campaigns") as any).delete().eq("id", id);
    fetchCampaigns();
    toast({ title: "Campagne supprimée" });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    paused: "bg-yellow-500/15 text-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-muted text-muted-foreground",
  };
  const statusLabels: Record<string, string> = {
    draft: "Brouillon", active: "Active", paused: "En pause", completed: "Terminée",
  };

  const totalBudget = campaigns.reduce((s, c) => s + Number(c.budget_total), 0);
  const totalSpent = campaigns.reduce((s, c) => s + Number(c.budget_spent), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                  <Megaphone className="w-6 h-6 shrink-0 text-primary" />
                  Mes campagnes
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">Regroupez vos boosts, suivez les budgets et performances</p>
              </div>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-hero">
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Créer une campagne</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Nom de la campagne *</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Promo rentrée scolaire" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Objectifs de la campagne..." rows={3} />
                    </div>
                    <div>
                      <Label>Objectif principal</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {objectiveOptions.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <div
                              key={opt.value}
                              onClick={() => setForm(f => ({ ...f, objective: opt.value }))}
                              className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${
                                form.objective === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                              }`}
                            >
                              <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>Budget total (FCFA) *</Label>
                      <Input type="number" value={form.budget_total} onChange={e => setForm(f => ({ ...f, budget_total: e.target.value }))} placeholder="50000" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Date de début</Label>
                        <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Date de fin</Label>
                        <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                      </div>
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !form.name || !form.budget_total} className="w-full">
                      {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Créer la campagne
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-xl font-bold truncate">{campaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Campagnes</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-xl font-bold truncate text-primary">{activeCampaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Actives</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-xl font-bold truncate">{totalBudget.toLocaleString()}F</p>
                  <p className="text-xs text-muted-foreground">Budget total</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-xl font-bold truncate text-primary">{totalSpent.toLocaleString()}F</p>
                  <p className="text-xs text-muted-foreground">Dépensé</p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign list */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : campaigns.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-6 sm:p-8 text-center">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <h3 className="font-bold text-lg mb-2">Aucune campagne</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Créez des campagnes pour organiser vos boosts par objectif
                  </p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Créer ma première campagne
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign, i) => {
                  const budgetPercent = campaign.budget_total > 0
                    ? Math.min(100, (Number(campaign.budget_spent) / Number(campaign.budget_total)) * 100) : 0;
                  const isExpanded = expandedCampaign === campaign.id;
                  const campaignBoosts = boostsByCampaign[campaign.id] || [];
                  const objectiveInfo = objectiveOptions.find(o => o.value === campaign.objective);
                  const daysRemaining = campaign.end_date
                    ? differenceInDays(new Date(campaign.end_date), new Date())
                    : null;

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-0 shadow-card hover:shadow-elevated transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-bold">{campaign.name}</h3>
                                <Badge className={statusColors[campaign.status] || ""}>
                                  {statusLabels[campaign.status] || campaign.status}
                                </Badge>
                                {objectiveInfo && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    {objectiveInfo.label}
                                  </Badge>
                                )}
                              </div>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(campaign)}>
                                {campaign.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/boost?campaign=${campaign.id}`)}>
                                <Zap className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCampaign(campaign.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Budget bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Budget utilisé</span>
                              <span className="font-medium">
                                {Number(campaign.budget_spent).toLocaleString()} / {Number(campaign.budget_total).toLocaleString()} FCFA
                              </span>
                            </div>
                            <Progress value={budgetPercent} className="h-2" />
                          </div>

                          {/* Dates + boosts count */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {campaign.start_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(campaign.start_date), "dd MMM yyyy", { locale: fr })}
                                </span>
                              )}
                              {campaign.end_date && (
                                <span>→ {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: fr })}</span>
                              )}
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  <Clock className="w-2.5 h-2.5 mr-1" />{daysRemaining}j restants
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                            >
                              <Zap className="w-3 h-3" />
                              {campaignBoosts.length} boost{campaignBoosts.length > 1 ? "s" : ""}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>

                          {/* Expanded boosts list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-border space-y-2">
                                  {campaignBoosts.length === 0 ? (
                                    <div className="text-center py-4">
                                      <p className="text-sm text-muted-foreground mb-2">Aucun boost dans cette campagne</p>
                                      <Button size="sm" variant="outline" onClick={() => navigate(`/boost?campaign=${campaign.id}`)}>
                                        <Zap className="w-3 h-3 mr-1" /> Ajouter un boost
                                      </Button>
                                    </div>
                                  ) : (
                                    campaignBoosts.map(boost => {
                                      const TypeIcon = typeIcons[boost.boost_type] || Package;
                                      const isActive = boost.is_active && new Date(boost.expires_at) > new Date();
                                      return (
                                        <div key={boost.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{boost.target_name || boost.boost_type}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {boost.zone_radius_km} km · {Number(boost.price_paid).toLocaleString()} F
                                              {boost.creative_url && " · 📷"}
                                            </p>
                                          </div>
                                          <Badge variant="outline" className={`text-[10px] ${isActive ? "border-primary text-primary" : ""}`}>
                                            {isActive ? "Actif" : "Terminé"}
                                          </Badge>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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

export default Campaigns;
