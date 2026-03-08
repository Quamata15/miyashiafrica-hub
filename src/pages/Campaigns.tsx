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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Megaphone, Plus, Loader2, Calendar, TrendingUp, Zap, BarChart3,
  Play, Pause, Trash2, Eye, Target
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

const Campaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    budget_total: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (user) fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await (supabase.from("campaigns") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
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
      status: "active",
    });
    setCreating(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la campagne", variant: "destructive" });
    } else {
      toast({ title: "Campagne créée! 🎯" });
      setShowCreate(false);
      setForm({ name: "", description: "", budget_total: "", start_date: "", end_date: "" });
      fetchCampaigns();
    }
  };

  const toggleStatus = async (campaign: any) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await (supabase.from("campaigns") as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", campaign.id);
    fetchCampaigns();
    toast({ title: newStatus === "active" ? "Campagne relancée" : "Campagne en pause" });
  };

  const deleteCampaign = async (id: string) => {
    await (supabase.from("campaigns") as any).delete().eq("id", id);
    fetchCampaigns();
    toast({ title: "Campagne supprimée" });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon", active: "Active", paused: "En pause", completed: "Terminée",
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                  <Megaphone className="w-8 h-8 text-primary" />
                  Mes Campagnes
                </h1>
                <p className="text-muted-foreground mt-1">Gérez vos campagnes de promotion et boosts</p>
              </div>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-hero">
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une campagne</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Nom de la campagne *</Label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ex: Promo rentrée scolaire"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Objectifs de la campagne..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Budget total (FCFA) *</Label>
                      <Input
                        type="number"
                        value={form.budget_total}
                        onChange={e => setForm(f => ({ ...f, budget_total: e.target.value }))}
                        placeholder="50000"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Date de début</Label>
                        <Input
                          type="date"
                          value={form.start_date}
                          onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Date de fin</Label>
                        <Input
                          type="date"
                          value={form.end_date}
                          onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !form.name || !form.budget_total}
                      className="w-full"
                    >
                      {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Créer la campagne
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Campagnes</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {campaigns.filter(c => c.status === "active").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Actives</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {campaigns.reduce((s, c) => s + Number(c.budget_total), 0).toLocaleString()}F
                  </p>
                  <p className="text-xs text-muted-foreground">Budget total</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {campaigns.reduce((s, c) => s + Number(c.budget_spent), 0).toLocaleString()}F
                  </p>
                  <p className="text-xs text-muted-foreground">Dépensé</p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12 text-center">
                  <Megaphone className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="font-bold text-lg mb-2">Aucune campagne</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Créez des campagnes pour regrouper vos boosts et suivre leur performance globale
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
                    ? Math.min(100, (Number(campaign.budget_spent) / Number(campaign.budget_total)) * 100)
                    : 0;

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
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold">{campaign.name}</h3>
                                <Badge className={statusColors[campaign.status] || ""}>
                                  {statusLabels[campaign.status] || campaign.status}
                                </Badge>
                              </div>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground">{campaign.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleStatus(campaign)}
                                title={campaign.status === "active" ? "Mettre en pause" : "Relancer"}
                              >
                                {campaign.status === "active" ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/boost?campaign=${campaign.id}`)}
                                title="Ajouter un boost"
                              >
                                <Zap className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteCampaign(campaign.id)}
                              >
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
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${budgetPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {campaign.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(campaign.start_date), "dd MMM yyyy", { locale: fr })}
                              </span>
                            )}
                            {campaign.end_date && (
                              <span>→ {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: fr })}</span>
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

export default Campaigns;
