import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormHead, StickySubmit } from "./FormBits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/ai";
import { User, DollarSign, Clock, Award, Loader2, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";

const freelanceSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100),
  hourly_rate: z.number().min(0, "Le taux horaire doit être positif").optional(),
  experience_years: z.number().int().min(0).optional(),
  availability: z.enum(["available", "busy", "unavailable"]),
  skills: z.array(z.string()).optional(),
});

interface FreelanceProfileFormProps {
  onSuccess?: () => void;
}

const FreelanceProfileForm = ({ onSuccess }: FreelanceProfileFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    hourly_rate: "",
    experience_years: "",
    availability: "available" as "available" | "busy" | "unavailable",
    skills: [] as string[],
  });

  useEffect(() => {
    if (user) {
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    const { data } = await supabase
      .from("freelance_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setIsEditing(true);
      setFormData({
        title: data.title || "",
        hourly_rate: data.hourly_rate?.toString() || "",
        experience_years: data.experience_years?.toString() || "",
        availability: (data.availability as "available" | "busy" | "unavailable") || "available",
        skills: data.skills || [],
      });
    }
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = freelanceSchema.safeParse({
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : undefined,
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

    const profileData = {
      title: formData.title,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      availability: formData.availability,
      skills: formData.skills.length > 0 ? formData.skills : null,
      user_id: user.id,
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("freelance_profiles")
        .update(profileData)
        .eq("user_id", user.id);
      error = result.error;
    } else {
      const result = await supabase.from("freelance_profiles").insert(profileData);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: errMsg(error), variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Profil freelance sauvegardé!" });
      setIsEditing(true);
      onSuccess?.();
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
          <FormHead icon={User} title={isEditing ? "Modifier votre profil Freelance" : "Créer votre profil Freelance"} hint="Présentez-vous aux employeurs potentiels" tone="bg-accent/10 text-accent" />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre professionnel *</Label>
              <Input
                id="title"
                placeholder="Ex: Développeur Full Stack Senior"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hourly_rate" className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Taux horaire (FCFA)
                </Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  placeholder="5000"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="experience_years" className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Années d'expérience
                </Label>
                <Input
                  id="experience_years"
                  type="number"
                  placeholder="3"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label htmlFor="availability" className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Disponibilité
                </Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value: "available" | "busy" | "unavailable") => 
                    setFormData({ ...formData, availability: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="busy">Occupé</SelectItem>
                    <SelectItem value="unavailable">Indisponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Compétences
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, Node.js, Python..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  Ajouter
                </Button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm cursor-pointer hover:bg-primary/20"
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
                    Sauvegarde en cours...
                  </>
                ) : isEditing ? (
                  "Mettre à jour le profil"
                ) : (
                  "Créer mon profil freelance"
                )}
              </Button>
            </StickySubmit>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FreelanceProfileForm;
