import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, DollarSign, Archive, Loader2, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";
import ProductMediaUpload from "./ProductMediaUpload";
import { AiListingButton, PriceSuggestion } from "./ListingAssist";
import { FormHead, StickySubmit } from "./FormBits";

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

  const field = (id: keyof typeof formData) => ({
    id, value: formData[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [id]: e.target.value }),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="shadow-elevated border-0">
        <CardContent className="pt-4 sm:pt-5">
          <FormHead icon={Package} title="Nouveau produit" hint="Ajoutez un produit à vendre sur la marketplace" />
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
            <div className="space-y-3 min-w-0">
              <div className="space-y-1.5">
                <Label htmlFor="title">Titre du produit *</Label>
                <Input placeholder="Ex: Pagne wax 6 yards" {...field("title")} className={errors.title ? "border-destructive" : ""} />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea placeholder="Décrivez votre produit : matière, taille, état…" {...field("description")} className="min-h-[88px]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Prix (FCFA) *</Label>
                  <Input type="number" inputMode="numeric" placeholder="0" {...field("price")} className={errors.price ? "border-destructive" : ""} />
                  {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="flex items-center gap-1.5"><Archive className="w-4 h-4" /> Stock</Label>
                  <Input type="number" inputMode="numeric" placeholder="1" {...field("stock")} className={errors.stock ? "border-destructive" : ""} />
                </div>
              </div>
              <PriceSuggestion title={formData.title} categoryId={formData.category_id} onPick={(p) => setFormData((f) => ({ ...f, price: String(p) }))} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Ville</Label>
                  <Input placeholder="Ex: Lomé" {...field("location")} />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger id="category"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2 min-w-0 lg:row-span-2">
              <Label className="flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> Photos & vidéos</Label>
              <ProductMediaUpload images={images} onImagesChange={setImages} />
              <AiListingButton images={images} hint={[formData.title, formData.description].filter(Boolean).join(" — ")} onDraft={(d) => {
                const cat = categories.find((c) => c.slug === d.category_slug);
                setFormData((f) => ({ ...f, title: d.title, description: `${d.description}${d.condition && d.condition !== "inconnu" ? `\n\nÉtat : ${d.condition}` : ""}`, category_id: cat?.id ?? f.category_id }));
              }} />
              <ul className="hidden lg:block mt-2 space-y-1 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <li>• 3 photos au moins : face, détail, étiquette ou taille</li>
                <li>• Lumière du jour et fond uni</li>
                <li>• Un prix juste se vend plus vite : utilisez le prix conseillé</li>
              </ul>
            </div>

            <StickySubmit className="lg:col-start-1">
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>) : "Publier le produit"}
              </Button>
            </StickySubmit>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductForm;
