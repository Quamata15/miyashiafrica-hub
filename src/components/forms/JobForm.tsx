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
import { Users, DollarSign, Calendar, Loader2, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

const jobSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100),
  description: z.string().max(5000).optional(),
  budget_min: z.number().min(0, "Le budget doit être positif").optional(),
  budget_max: z.number().min(0, "Le budget doit être positif").optional(),
  job_type: z.enum(["remote", "onsite", "hybrid"]),
  skills_required: z.array(z.string()).optional(),
  category_id: z.string().uuid().optional(),
});

interface JobFormProps {
  categories: Category[];
  onSuccess?: () => void;
  /** Opens the recruiter space editor (CV sorting, interviews). */
  onFullEditor?: () => void;
}

const JobForm = ({ categories, onSuccess, onFullEditor }: JobFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget_min: "",
    budget_max: "",
    job_type: "remote" as "remote" | "onsite" | "hybrid",
    skills_required: [] as string[],
    category_id: "",
    deadline: "",
  });

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills_required.includes(skill)) {
      setFormData({
        ...formData,
        skills_required: [...formData.skills_required, skill],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = jobSchema.safeParse({
      ...formData,
      budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
      budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
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
    
    const { error } = await supabase.from("jobs").insert({
      title: formData.title,
      description: formData.description || null,
      budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
      budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
      job_type: formData.job_type,
      skills_required: formData.skills_required.length > 0 ? formData.skills_required : null,
      category_id: formData.category_id || null,
      deadline: formData.deadline || null,
      employer_id: user.id,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer l'offre", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Offre d'emploi créée avec succès!" });
      onSuccess?.();
      navigate("/freelance");
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
          <FormHead icon={Users} title="Nouvelle offre d'emploi ou mission" hint="Tri des CV et entretiens vidéo : éditeur complet" tone="bg-accent/10 text-accent"
            action={onFullEditor && <Button type="button" size="sm" variant="outline" onClick={onFullEditor}>Éditeur complet</Button>} />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre du poste *</Label>
              <Input
                id="title"
                placeholder="Ex: Développeur React Senior"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description du poste</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le poste, les responsabilités, les attentes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[88px]"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget_min" className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Budget min (FCFA)
                </Label>
                <Input
                  id="budget_min"
                  type="number"
                  placeholder="0"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget_max" className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Budget max (FCFA)
                </Label>
                <Input
                  id="budget_max"
                  type="number"
                  placeholder="0"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label htmlFor="job_type">Type de travail</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value: "remote" | "onsite" | "hybrid") => 
                    setFormData({ ...formData, job_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">À distance</SelectItem>
                    <SelectItem value="onsite">Sur place</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Date limite
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Compétences requises
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, TypeScript..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  Ajouter
                </Button>
              </div>
              {formData.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills_required.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm cursor-pointer hover:bg-accent/20"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            <StickySubmit>
              <Button type="submit" variant="accent" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Publier l'offre"
                )}
              </Button>
            </StickySubmit>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default JobForm;
