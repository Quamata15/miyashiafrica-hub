import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormHead, StickySubmit } from "./FormBits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/ai";
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
      toast({ title: "Erreur", description: errMsg(error), variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Service créé avec succès!" });
      onSuccess?.();
      navigate("/services");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-elevated border-0">
        <CardContent className="pt-4 sm:pt-5">
          <FormHead icon={Briefcase} title="Nouveau service" hint="Proposez vos services aux clients" tone="bg-secondary/10 text-secondary" />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre service en détail, vos compétences, ce que vous proposez..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[88px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="flex items-center gap-1.5">
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

              <div className="space-y-1.5">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="delivery_days" className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Délai (jours)
                </Label>
                <Input
                  id="delivery_days"
                  type="number"
                  placeholder="7"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
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

            <StickySubmit>
              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Publier le service"
                )}
              </Button>
            </StickySubmit>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ServiceForm;
