// Company profile shown on the recruiter's offers.
import { useEffect, useState } from "react";
import { Save, Loader2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, attempt } from "../kit";

type F = { company_name: string; website: string; sector: string; size: string; city: string; country: string; about: string; logo_url: string; verified: boolean };
const COUNTRIES = [["TG", "Togo"], ["BJ", "Bénin"], ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["BF", "Burkina Faso"], ["ML", "Mali"], ["NE", "Niger"], ["GN", "Guinée"], ["GH", "Ghana"], ["NG", "Nigeria"], ["CM", "Cameroun"]];

export default function CompanyProfileForm() {
  const { user } = useAuth();
  const [f, setF] = useState<F>({ company_name: "", website: "", sector: "", size: "", city: "", country: "TG", about: "", logo_url: "", verified: false });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("employer_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data: d }) => d && setF({ company_name: d.company_name, website: d.website ?? "", sector: d.sector ?? "", size: d.size ?? "", city: d.city ?? "", country: d.country ?? "TG", about: d.about ?? "", logo_url: d.logo_url ?? "", verified: d.verified }));
  }, [user?.id]);
  const set = (k: keyof F, v: string) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!user) return;
    setSaving(true);
    await attempt(() => supabase.from("employer_profiles").upsert({ user_id: user.id, company_name: f.company_name.trim(), website: f.website.trim() || null, sector: f.sector.trim() || null, size: f.size || null,
      city: f.city.trim() || null, country: f.country || null, about: f.about.trim() || null, logo_url: f.logo_url.trim() || null }), "Entreprise enregistrée");
    setSaving(false);
  };
  return (
    <Section title={<span className="flex items-center gap-2">Votre entreprise {f.verified && <BadgeCheck className="w-5 h-5 text-primary" aria-label="Entreprise vérifiée" />}</span>}
      description="Les candidats postulent plus volontiers quand ils savent pour qui ils vont travailler. Le badge « vérifiée » est attribué par l'équipe MIYASHI.">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nom de l'entreprise *</Label><Input maxLength={120} value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
        <div><Label>Secteur</Label><Input maxLength={80} value={f.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Logistique, banque, BTP…" /></div>
        <div><Label>Taille</Label><Select value={f.size} onValueChange={(v) => set("size", v)}><SelectTrigger><SelectValue placeholder="Nombre de salariés" /></SelectTrigger><SelectContent>{["1-10", "11-50", "51-200", "201-1000", "1000+"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Site web</Label><Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></div>
        <div><Label>Ville</Label><Input maxLength={80} value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div><Label>Pays</Label><Select value={f.country} onValueChange={(v) => set("country", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div className="md:col-span-2"><Label>Logo (adresse de l'image)</Label><Input value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" /></div>
        <div className="md:col-span-2"><Label>Présentation</Label><Textarea rows={5} maxLength={3000} value={f.about} onChange={(e) => set("about", e.target.value)} placeholder="Votre activité, vos valeurs, ce que vous offrez à vos équipes." /></div>
      </div>
      <Button className="mt-4" onClick={save} disabled={saving || f.company_name.trim().length < 2}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer</Button>
    </Section>
  );
}
