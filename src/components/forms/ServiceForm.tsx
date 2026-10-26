import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Clock, DollarSign, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

const serviceSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(0, "Le prix doit être positif").optional(),
  delivery_days: z.number().int().min(1, "Le délai minimum est 1 jour").optional(),
  price_type: z.enum(["fixed", "negotiable"]),
  category_id: z.string().uuid().optional(),
});

interface ServiceFormProps {
  categories: Category[];
  onSuccess?: () => void;
}

const ServiceForm = ({ categories, onSuccess }: ServiceFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    delivery_days: "",
    price_type: "fixed" as "fixed" | "negotiable",
    category_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = serviceSchema.safeParse({
      ...formData,
      price: formData.price ? parseFloat(formData.price) : undefined,
      delivery_days: formData.delivery_days ? parseInt(formData.delivery_days) : undefined,
      category_id: formData.category_id || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.from("services").insert({
      title: formData.title,
      description: formData.description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      delivery_days: formData.delivery_days ? parseInt(formData.delivery_days) : null,
      price_type: formData.price_type,
      category_id: formData.category_id || null,
      provider_id: user.id,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le service", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Service créé avec succès!" });
      onSuccess?.();
      navigate("/services");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-elevated border-0">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Nouveau Service</CardTitle>
              <CardDescription>Proposez vos services aux clients</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du service *</Label>
              <Input
                id="title"
                placeholder="Ex: Développement Web Full Stack"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre service en détail, vos compétences, ce que vous proposez..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Prix (FCFA)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={errors.price ? "border-destructive" : ""}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_type">Type de prix</Label>
                <Select
                  value={formData.price_type}
                  onValueChange={(value: "fixed" | "negotiable") => 
                    setFormData({ ...formData, price_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Prix fixe</SelectItem>
                    <SelectItem value="negotiable">À négocier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_days" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Délai de livraison (jours)
                </Label>
                <Input
                  id="delivery_days"
                  type="number"
                  placeholder="7"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Publier le service"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ServiceForm;
