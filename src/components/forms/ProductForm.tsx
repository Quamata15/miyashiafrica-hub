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
import { Package, MapPin, DollarSign, Archive, Loader2, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";
import ProductMediaUpload from "./ProductMediaUpload";
import { AiListingButton, PriceSuggestion } from "./ListingAssist";

type Category = Tables<"categories">;

const productSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().int().min(0, "Le stock doit être positif"),
  location: z.string().max(100).optional(),
  category_id: z.string().uuid().optional(),
});

interface ProductFormProps {
  categories: Category[];
  onSuccess?: () => void;
}

const ProductForm = ({ categories, onSuccess }: ProductFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "1",
    location: "",
    category_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = productSchema.safeParse({
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
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
    
    const { error } = await supabase.from("products").insert({
      title: formData.title,
      description: formData.description || null,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      location: formData.location || null,
      category_id: formData.category_id || null,
      seller_id: user.id,
      images: images.length > 0 ? images : null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Produit créé avec succès!" });
      onSuccess?.();
      navigate("/marketplace");
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
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Nouveau Produit</CardTitle>
              <CardDescription>Ajoutez un produit à vendre sur la marketplace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du produit *</Label>
              <Input
                id="title"
                placeholder="Ex: iPhone 14 Pro Max"
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
                placeholder="Décrivez votre produit en détail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4" /> Photos & Vidéos
              </Label>
              <ProductMediaUpload images={images} onImagesChange={setImages} />
              <AiListingButton images={images} hint={[formData.title, formData.description].filter(Boolean).join(" — ")} onDraft={(d) => {
                const cat = categories.find((c) => c.slug === d.category_slug);
                setFormData((f) => ({ ...f, title: d.title, description: `${d.description}${d.condition && d.condition !== "inconnu" ? `\n\nÉtat : ${d.condition}` : ""}`, category_id: cat?.id ?? f.category_id }));
              }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Prix (FCFA) *
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
                <PriceSuggestion title={formData.title} categoryId={formData.category_id} onPick={(p) => setFormData((f) => ({ ...f, price: String(p) }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="flex items-center gap-2">
                  <Archive className="w-4 h-4" /> Stock disponible
                </Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="1"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className={errors.stock ? "border-destructive" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Localisation
                </Label>
                <Input
                  id="location"
                  placeholder="Ex: Dakar, Sénégal"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Publier le produit"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductForm;
