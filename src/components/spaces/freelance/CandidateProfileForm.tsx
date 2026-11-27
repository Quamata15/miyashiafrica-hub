// Candidate profile: what the matching uses (skills, experience, languages, location) and the CV.
import { useEffect, useState } from "react";
import { Save, Loader2, Upload, FileCheck2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CONTRACTS, Section, attempt, signedUrl, splitList } from "../kit";

type F = { title: string; bio: string; skills: string; experience_years: string; hourly_rate: string; availability: string; languages: string; location: string; education: string;
  contract_types: string[]; open_to_work: boolean; cv_path: string | null; cv_text: string };
const init: F = { title: "", bio: "", skills: "", experience_years: "", hourly_rate: "", availability: "Disponible", languages: "Français", location: "", education: "", contract_types: ["freelance"], open_to_work: true, cv_path: null, cv_text: "" };

export default function CandidateProfileForm() {
  const { user } = useAuth();
  const [f, setF] = useState<F>(init);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("freelance_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data: d }) => {
      if (d) setF({ title: d.title ?? "", bio: d.bio ?? "", skills: (d.skills ?? []).join(", "), experience_years: d.experience_years?.toString() ?? "", hourly_rate: d.hourly_rate?.toString() ?? "",
        availability: d.availability ?? "Disponible", languages: (d.languages ?? []).join(", "), location: d.location ?? "", education: d.education ?? "",
        contract_types: d.contract_types?.length ? d.contract_types : ["freelance"], open_to_work: d.open_to_work, cv_path: d.cv_path, cv_text: d.cv_text ?? "" });
    });
  }, [user?.id]);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("CV trop lourd (10 Mo maximum)");
    setUploading(true);
    const path = `${user.id}/cv-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() || "pdf"}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { contentType: file.type || "application/pdf" });
    setUploading(false);
    if (error) return toast.error("Envoi impossible : PDF, Word, JPG ou PNG");
    set("cv_path", path);
    await supabase.from("freelance_profiles").upsert({ user_id: user.id, cv_path: path }, { onConflict: "user_id" });
    toast.success("CV enregistré");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await attempt(() => supabase.from("freelance_profiles").upsert({
      user_id: user.id, title: f.title.trim() || null, bio: f.bio.trim() || null, skills: splitList(f.skills).slice(0, 30), experience_years: f.experience_years ? Number(f.experience_years) : null,
      hourly_rate: f.hourly_rate ? Number(f.hourly_rate) : null, availability: f.availability || null, languages: splitList(f.languages).slice(0, 10), location: f.location.trim() || null,
      education: f.education.trim() || null, contract_types: f.contract_types, open_to_work: f.open_to_work, cv_text: f.cv_text.trim().slice(0, 20000) || null, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }), "Profil enregistré : vos correspondances sont mises à jour");
    setSaving(false);
  };

  return (
    <Section title="Profil & CV" description="Ces informations servent à calculer votre correspondance avec chaque offre. Plus elles sont précises, meilleures sont vos suggestions.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Titre</Label><Input maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Développeuse web React · Comptable OHADA · Chauffeur poids lourd" /></div>
        <div className="md:col-span-2"><Label>Compétences (séparées par des virgules)</Label><Input value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, Node.js, SQL, Figma" /></div>
        <div><Label>Années d'expérience</Label><Input type="number" min={0} max={60} value={f.experience_years} onChange={(e) => set("experience_years", e.target.value)} /></div>
        <div><Label>Langues</Label><Input value={f.languages} onChange={(e) => set("languages", e.target.value)} placeholder="Français, Anglais, Éwé" /></div>
        <div><Label>Ville</Label><Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Lomé, Togo" /></div>
        <div><Label>Tarif indicatif (FCFA / heure)</Label><Input type="number" min={0} step={500} value={f.hourly_rate} onChange={(e) => set("hourly_rate", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Formation</Label><Input maxLength={300} value={f.education} onChange={(e) => set("education", e.target.value)} placeholder="Licence en informatique, Université de Lomé (2019)" /></div>
        <div className="md:col-span-2"><Label>Présentation</Label><Textarea rows={4} maxLength={3000} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Ce que vous faites, pour qui, vos meilleurs résultats." /></div>
        <div className="md:col-span-2">
          <Label>Contrats recherchés</Label>
          <div className="mt-2 flex flex-wrap gap-4">
            {Object.entries(CONTRACTS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={f.contract_types.includes(k)} onCheckedChange={(c) => set("contract_types", c ? [...f.contract_types, k] : f.contract_types.filter((x) => x !== k))} />{v}</label>
            ))}
          </div>
        </div>
        <label className="md:col-span-2 flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">
          <span>Ouvert aux opportunités<span className="block text-xs text-muted-foreground">Les recruteurs peuvent vous trouver dans leur vivier de talents.</span></span>
          <Switch checked={f.open_to_work} onCheckedChange={(v) => set("open_to_work", v)} />
        </label>
        <div className="md:col-span-2 rounded-xl border border-dashed border-foreground/20 p-4">
          <p className="font-medium text-sm">CV</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {f.cv_path ? <span className="flex items-center gap-1 text-sm text-emerald-400"><FileCheck2 className="w-4 h-4" />CV enregistré</span> : <span className="text-sm text-muted-foreground">Aucun CV</span>}
            <label className="inline-flex"><input type="file" className="sr-only" accept=".pdf,.doc,.docx,image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <span className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{f.cv_path ? "Remplacer" : "Déposer mon CV"}</span></label>
            {f.cv_path && <Button size="sm" variant="ghost" onClick={async () => { const u = await signedUrl("cvs", f.cv_path!); if (u) window.open(u, "_blank"); }}><Eye className="w-4 h-4 mr-1" />Voir</Button>}
          </div>
          <Label className="mt-3 block">Texte du CV (facultatif)</Label>
          <Textarea rows={4} value={f.cv_text} onChange={(e) => set("cv_text", e.target.value)} placeholder="Collez ici le contenu de votre CV : expériences, outils, diplômes. Il aide à trouver les offres qui vous correspondent." />
          <p className="text-xs text-muted-foreground mt-1">Votre CV n'est visible que par vous et par les recruteurs des offres auxquelles vous postulez.</p>
        </div>
      </div>
      <Button className="mt-4" onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer</Button>
    </Section>
  );
}
