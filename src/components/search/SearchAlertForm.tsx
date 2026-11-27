import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

interface SearchAlert {
  id: string;
  name: string;
  type: string;
  filters: {
    keywords?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    location?: string;
  };
  is_active: boolean;
  created_at: string;
}

const SearchAlertForm = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "product",
    keywords: "",
    category_id: "",
    min_price: 0,
    max_price: 1000000,
    location: ""
  });

  useEffect(() => {
    if (user) {
      fetchAlerts();
      fetchCategories();
    }
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from("search_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAlerts(data as SearchAlert[]);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      toast.error("Veuillez donner un nom à votre alerte");
      return;
    }

    setLoading(true);

    const { error } = await (supabase as any).from("search_alerts").insert({
      user_id: user.id,
      name: formData.name,
      type: formData.type,
      filters: {
        keywords: formData.keywords || undefined,
        category_id: formData.category_id || undefined,
        min_price: formData.min_price || undefined,
        max_price: formData.max_price || undefined,
        location: formData.location || undefined
      }
    });

    if (error) {
      toast.error("Erreur lors de la création de l'alerte");
    } else {
      toast.success("Alerte créée avec succès");
      setFormData({
        name: "",
        type: "product",
        keywords: "",
        category_id: "",
        min_price: 0,
        max_price: 1000000,
        location: ""
      });
      setShowForm(false);
      fetchAlerts();
    }
    setLoading(false);
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    const { error } = await (supabase as any)
      .from("search_alerts")
      .update({ is_active: !isActive })
      .eq("id", alertId);

    if (!error) {
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, is_active: !isActive } : a
      ));
      toast.success(isActive ? "Alerte désactivée" : "Alerte activée");
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await (supabase as any)
      .from("search_alerts")
      .delete()
      .eq("id", alertId);

    if (!error) {
      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success("Alerte supprimée");
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'XOF',
      minimumFractionDigits: 0 
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Alertes de Recherche
            </CardTitle>
            <CardDescription>
              Recevez des notifications quand de nouveaux produits ou services correspondent à vos critères
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Alerte
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="space-y-3 p-3 sm:p-4 bg-muted/50 rounded-lg border"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nom de l'alerte *</Label>
                  <Input
                    placeholder="Ex: Téléphones moins de 100 000 FCFA"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v, category_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produits</SelectItem>
                      <SelectItem value="service">Services</SelectItem>
                      <SelectItem value="job">Offres d'emploi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mots-clés</Label>
                <Input
                  placeholder="Ex: smartphone, iPhone, Samsung..."
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les catégories</SelectItem>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Localisation</Label>
                  <Input
                    placeholder="Ex: Lomé, Kara..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Fourchette de prix: {formatPrice(formData.min_price)} - {formatPrice(formData.max_price)}</Label>
                <Slider
                  value={[formData.min_price, formData.max_price]}
                  min={0}
                  max={5000000}
                  step={10000}
                  onValueChange={([min, max]) => setFormData({ ...formData, min_price: min, max_price: max })}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  <Bell className="h-4 w-4 mr-2" />
                  Créer l'alerte
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Existing Alerts */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune alerte configurée</p>
              <p className="text-sm">Créez une alerte pour être notifié des nouvelles publications</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border transition-colors ${
                  alert.is_active ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{alert.name}</h4>
                      <Badge variant={alert.is_active ? "default" : "secondary"}>
                        {alert.type === "product" ? "Produit" : alert.type === "service" ? "Service" : "Emploi"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {alert.filters?.keywords && (
                        <span>Mots-clés: {alert.filters.keywords}</span>
                      )}
                      {alert.filters?.min_price !== undefined && alert.filters?.max_price !== undefined && (
                        <span>Prix: {formatPrice(alert.filters.min_price)} - {formatPrice(alert.filters.max_price)}</span>
                      )}
                      {alert.filters?.location && (
                        <span>Lieu: {alert.filters.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => toggleAlert(alert.id, alert.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchAlertForm;
