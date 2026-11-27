// Public professional profile of a provider: shown on their page and their services.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Save, Loader2, ExternalLink } from "lucide-react";
import LocateButton from "@/components/search/LocateButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Section, attempt, splitList } from "../kit";

type Form = { lat: number | null; lng: number | null; city: string; headline: string; about: string; service_areas: string; languages: string; years_experience: string; certifications: string; response_hours: string; accepts_urgent: boolean; travels: boolean; travel_fee: string; is_available: boolean };
const init: Form = { lat: null, lng: null, city: "", headline: "", about: "", service_areas: "", languages: "Français", years_experience: "", certifications: "", response_hours: "24", accepts_urgent: false, travels: true, travel_fee: "", is_available: true };

export default function ProviderProfileForm() {
  const { user } = useAuth();
  const [f, setF] = useState<Form>(init);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("provider_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data: d }) => {
      if (d) setF({ lat: d.lat ?? null, lng: d.lng ?? null, city: d.city ?? "", headline: d.headline ?? "", about: d.about ?? "", service_areas: (d.service_areas ?? []).join(", "), languages: (d.languages ?? []).join(", "),
        years_experience: d.years_experience?.toString() ?? "", certifications: ((d.certifications as { name: string }[]) ?? []).map((c) => c.name).join("\n"),
        response_hours: String(d.response_hours ?? 24), accepts_urgent: d.accepts_urgent, travels: d.travels, travel_fee: d.travel_fee?.toString() ?? "", is_available: d.is_available });
    });
  }, [user?.id]);
  const set = (k: keyof Form, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!user) return;
    setSaving(true);
    await attempt(() => supabase.from("provider_profiles").upsert({
      user_id: user.id, headline: f.headline.trim() || null, about: f.about.trim() || null, service_areas: splitList(f.service_areas), languages: splitList(f.languages),
      years_experience: f.years_experience ? Number(f.years_experience) : null, certifications: f.certifications.split("\n").map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
      response_hours: Number(f.response_hours) || 24, accepts_urgent: f.accepts_urgent, travels: f.travels, travel_fee: f.travel_fee ? Number(f.travel_fee) : null, is_available: f.is_available, updated_at: new Date().toISOString(),
      city: f.city.trim() || null, lat: f.lat, lng: f.lng,
    }), "Profil pro enregistré");
    setSaving(false);
  };
  return (
    <Section title="Profil professionnel" description="Ce que les clients voient sur votre page et vos services."
      action={user && <Button variant="outline" size="sm" asChild><Link to={`/user/${user.id}`} target="_blank"><ExternalLink className="w-4 h-4 mr-1" />Ma page</Link></Button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Accroche</Label><Input maxLength={100} value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Électricien bâtiment agréé — dépannage 7j/7 à Lomé" /></div>
        <div className="md:col-span-2"><Label>Présentation</Label><Textarea rows={5} maxLength={3000} value={f.about} onChange={(e) => set("about", e.target.value)} placeholder="Votre parcours, votre façon de travailler, ce qui vous distingue." /></div>
        <div><Label>Ville principale</Label><Input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Lomé" /></div>
        <div className="flex flex-wrap items-end gap-2 text-xs text-muted-foreground"><LocateButton value={{ lat: f.lat, lng: f.lng }} onLocate={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} label="Position exacte (atelier, bureau)" /><span>Les clients à moins de 25 km vous voient en premier.</span></div>
        <div><Label>Zones d'intervention (séparées par des virgules)</Label><Input value={f.service_areas} onChange={(e) => set("service_areas", e.target.value)} placeholder="Lomé, Bè, Agoè, Baguida" /></div>
        <div><Label>Langues</Label><Input value={f.languages} onChange={(e) => set("languages", e.target.value)} placeholder="Français, Éwé, Anglais" /></div>
        <div><Label>Années d'expérience</Label><Input type="number" min={0} max={70} value={f.years_experience} onChange={(e) => set("years_experience", e.target.value)} /></div>
        <div><Label>Délai de réponse habituel (heures)</Label><Input type="number" min={1} max={168} value={f.response_hours} onChange={(e) => set("response_hours", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Diplômes et certifications (un par ligne)</Label><Textarea rows={3} value={f.certifications} onChange={(e) => set("certifications", e.target.value)} placeholder={"CAP électricité — 2015\nHabilitation électrique B1V"} /></div>
        <label className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">Disponible pour de nouvelles demandes <Switch checked={f.is_available} onCheckedChange={(v) => set("is_available", v)} /></label>
        <label className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">J'accepte les urgences <Switch checked={f.accepts_urgent} onCheckedChange={(v) => set("accepts_urgent", v)} /></label>
        <label className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">Je me déplace chez le client <Switch checked={f.travels} onCheckedChange={(v) => set("travels", v)} /></label>
        {f.travels && <div><Label>Frais de déplacement (FCFA, facultatif)</Label><Input type="number" min={0} step={500} value={f.travel_fee} onChange={(e) => set("travel_fee", e.target.value)} /></div>}
      </div>
      <Button className="mt-4" onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer</Button>
    </Section>
  );
}
