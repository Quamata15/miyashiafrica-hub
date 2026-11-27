// Full job offer editor: description, conditions, matching criteria, screening and interview questions.
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Wand2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CONTRACTS, PERIODS, REMOTE, cleanError, splitList } from "../kit";

export type SQ = { id: string; text: string; type: "yesno" | "number" | "text" | "choice"; required: boolean; knockout?: string; options?: string[] };
export type IQ = { id: string; text: string; competency: string; keywords: string[]; seconds: number };
export type JobRow = { id?: string; title: string; description: string; company_name: string; contract_type: string; remote_mode: string; location: string; pay_period: string;
  budget_min: number | null; budget_max: number | null; experience_min: number; education_level: string; skills_required: string[]; skill_weights: Record<string, number>; nice_to_have: string[];
  languages: string[]; openings: number; deadline: string | null; blind_review: boolean; screening_questions: SQ[]; interview_questions: IQ[]; is_active: boolean };

export const blankJob = (company = ""): JobRow => ({ title: "", description: "", company_name: company, contract_type: "cdi", remote_mode: "onsite", location: "", pay_period: "mois", budget_min: null, budget_max: null,
  experience_min: 0, education_level: "", skills_required: [], skill_weights: {}, nice_to_have: [], languages: ["Français"], openings: 1, deadline: null, blind_review: false,
  screening_questions: [], interview_questions: [], is_active: true });

const uid = () => Math.random().toString(36).slice(2, 8);

export default function JobEditor({ job, open, onOpenChange, onSaved }: { job: JobRow | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (id: string, rescore: boolean) => void }) {
  const { user } = useAuth();
  const [j, setJ] = useState<JobRow>(blankJob());
  const [skills, setSkills] = useState(""); const [nice, setNice] = useState(""); const [langs, setLangs] = useState("");
  const [saving, setSaving] = useState(false); const [gen, setGen] = useState(false);

  useEffect(() => {
    if (!open || !job) return;
    setJ(job); setSkills(job.skills_required.join(", ")); setNice(job.nice_to_have.join(", ")); setLangs(job.languages.join(", "));
  }, [open, job]);
  const set = <K extends keyof JobRow>(k: K, v: JobRow[K]) => setJ((x) => ({ ...x, [k]: v }));
  const skillList = splitList(skills).slice(0, 20);

  const setQ = (i: number, patch: Partial<SQ>) => set("screening_questions", j.screening_questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const setI = (i: number, patch: Partial<IQ>) => set("interview_questions", j.interview_questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));

  const generate = async () => {
    setGen(true);
    const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action: "interview_questions", title: j.title, description: j.description, skills: skillList, count: 6 } });
    setGen(false);
    if (error || !data?.questions) return toast.error("Génération impossible pour le moment");
    set("interview_questions", data.questions);
    toast.success(data.source === "ia" ? "Questions rédigées par l'assistant : relisez-les" : "Questions proposées à partir du poste : adaptez-les");
  };

  const save = async () => {
    if (!user) return;
    if (j.title.trim().length < 3 || j.description.trim().length < 30) return toast.error("Intitulé (3 caractères) et description (30 caractères) obligatoires");
    if (j.budget_min && j.budget_max && j.budget_min > j.budget_max) return toast.error("Le minimum dépasse le maximum");
    setSaving(true);
    const weights = Object.fromEntries(Object.entries(j.skill_weights).filter(([k]) => skillList.includes(k)));
    const row = { employer_id: user.id, title: j.title.trim(), description: j.description.trim(), company_name: j.company_name.trim() || null, contract_type: j.contract_type, remote_mode: j.remote_mode,
      location: j.location.trim() || null, pay_period: j.pay_period, budget_min: j.budget_min, budget_max: j.budget_max, experience_min: j.experience_min, education_level: j.education_level.trim() || null,
      skills_required: skillList, skill_weights: weights, nice_to_have: splitList(nice).slice(0, 15), languages: splitList(langs).slice(0, 8), openings: j.openings,
      deadline: j.deadline ? new Date(j.deadline + "T23:59:00").toISOString() : null, blind_review: j.blind_review, is_active: j.is_active,
      screening_questions: j.screening_questions.filter((q) => q.text.trim().length >= 3).map((q) => ({ ...q, text: q.text.trim(), knockout: q.knockout?.trim() || undefined, options: q.type === "choice" ? (q.options ?? []).filter(Boolean) : undefined })),
      interview_questions: j.interview_questions.filter((q) => q.text.trim().length >= 5).map((q, i) => ({ ...q, id: q.id || `q${i + 1}` })) };
    const res = j.id ? await supabase.from("jobs").update(row).eq("id", j.id).select("id").single() : await supabase.from("jobs").insert(row).select("id").single();
    setSaving(false);
    if (res.error) return toast.error(cleanError(res.error.message));
    toast.success(j.id ? "Offre mise à jour" : j.is_active ? "Offre publiée" : "Brouillon enregistré");
    onSaved(res.data.id, !!j.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{j.id ? "Modifier l'offre" : "Nouvelle offre"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="poste">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="poste">Poste</TabsTrigger><TabsTrigger value="criteres">Critères de tri</TabsTrigger>
            <TabsTrigger value="questions">Questions ({j.screening_questions.length})</TabsTrigger><TabsTrigger value="entretien">Entretien ({j.interview_questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="poste" className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Intitulé *</Label><Input maxLength={150} value={j.title} onChange={(e) => set("title", e.target.value)} placeholder="Comptable confirmé(e)" /></div>
              <div><Label>Entreprise</Label><Input maxLength={120} value={j.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
              <div><Label>Lieu</Label><Input maxLength={120} value={j.location} onChange={(e) => set("location", e.target.value)} placeholder="Lomé" /></div>
              <div><Label>Contrat</Label><Select value={j.contract_type} onValueChange={(v) => set("contract_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONTRACTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Mode de travail</Label><Select value={j.remote_mode} onValueChange={(v) => set("remote_mode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REMOTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div><Label>Rémunération min (FCFA)</Label><Input type="number" min={0} step={5000} value={j.budget_min ?? ""} onChange={(e) => set("budget_min", e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Max (FCFA)</Label><Input type="number" min={0} step={5000} value={j.budget_max ?? ""} onChange={(e) => set("budget_max", e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
              <div><Label>Par</Label><Select value={j.pay_period} onValueChange={(v) => set("pay_period", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Postes</Label><Input type="number" min={1} max={500} value={j.openings} onChange={(e) => set("openings", Number(e.target.value) || 1)} /></div>
                <div><Label>Date limite</Label><Input type="date" value={j.deadline?.slice(0, 10) ?? ""} onChange={(e) => set("deadline", e.target.value || null)} /></div>
              </div>
              <div className="sm:col-span-2"><Label>Description * (missions, environnement, avantages)</Label><Textarea rows={7} maxLength={8000} value={j.description} onChange={(e) => set("description", e.target.value)} /></div>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">Publier l'offre maintenant<Switch checked={j.is_active} onCheckedChange={(v) => set("is_active", v)} /></label>
          </TabsContent>

          <TabsContent value="criteres" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Ces critères calculent la correspondance (0-100) de chaque candidature : compétences 50 points, expérience 20, langues 10, lieu 10, questions 10, atouts jusqu'à +6.</p>
            <div><Label>Compétences demandées (séparées par des virgules)</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Comptabilité OHADA, Sage, Excel, Fiscalité" /></div>
            {skillList.length > 0 && (
              <div className="rounded-xl border border-foreground/10 p-3">
                <p className="text-sm font-medium mb-2">Importance de chaque compétence</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {skillList.map((s) => (
                    <div key={s} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{s}</span>
                      <div className="flex gap-1" role="radiogroup" aria-label={`Importance de ${s}`}>
                        {[1, 2, 3].map((w) => (
                          <button key={w} role="radio" aria-checked={(j.skill_weights[s] ?? 1) === w} onClick={() => set("skill_weights", { ...j.skill_weights, [s]: w })}
                            className={`rounded-md px-2 py-0.5 text-xs border ${(j.skill_weights[s] ?? 1) === w ? "bg-primary text-primary-foreground border-primary" : "border-foreground/15"}`}>{w === 1 ? "Utile" : w === 2 ? "Important" : "Essentiel"}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div><Label>Atouts appréciés</Label><Input value={nice} onChange={(e) => setNice(e.target.value)} placeholder="Anglais courant, Permis B" /></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Expérience minimale (ans)</Label><Input type="number" min={0} max={40} value={j.experience_min} onChange={(e) => set("experience_min", Number(e.target.value) || 0)} /></div>
              <div><Label>Langues</Label><Input value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="Français, Anglais" /></div>
              <div><Label>Niveau d'études</Label><Input maxLength={60} value={j.education_level} onChange={(e) => set("education_level", e.target.value)} placeholder="BTS, Licence…" /></div>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm">
              <span>Tri anonyme<span className="block text-xs text-muted-foreground">Nom et photo masqués tant que la candidature n'est pas présélectionnée : vous jugez d'abord les compétences.</span></span>
              <Switch checked={j.blind_review} onCheckedChange={(v) => set("blind_review", v)} />
            </label>
          </TabsContent>

          <TabsContent value="questions" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Posées au moment de la candidature (10 maximum). Une réponse attendue rend la question éliminatoire : la candidature est signalée, jamais supprimée.</p>
            {j.screening_questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-foreground/10 p-3 space-y-2">
                <div className="flex gap-2"><Input aria-label="Question" value={q.text} maxLength={200} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Avez-vous le permis moto ?" />
                  <Button size="icon" variant="ghost" aria-label="Supprimer la question" onClick={() => set("screening_questions", j.screening_questions.filter((_, k) => k !== i))}><Trash2 className="w-4 h-4" /></Button></div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Select value={q.type} onValueChange={(v) => setQ(i, { type: v as SQ["type"], knockout: undefined })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yesno">Oui / Non</SelectItem><SelectItem value="number">Nombre</SelectItem><SelectItem value="text">Texte libre</SelectItem><SelectItem value="choice">Choix</SelectItem></SelectContent></Select>
                  <label className="flex items-center gap-2"><Switch checked={q.required} onCheckedChange={(v) => setQ(i, { required: v })} />Obligatoire</label>
                  {q.type === "yesno" && <Select value={q.knockout ?? "none"} onValueChange={(v) => setQ(i, { knockout: v === "none" ? undefined : v })}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Pas éliminatoire</SelectItem><SelectItem value="oui">Éliminatoire si « non »</SelectItem><SelectItem value="non">Éliminatoire si « oui »</SelectItem></SelectContent></Select>}
                  {q.type === "number" && <label className="flex items-center gap-2">Minimum<Input className="w-24" type="number" value={q.knockout ?? ""} onChange={(e) => setQ(i, { knockout: e.target.value || undefined })} /></label>}
                </div>
                {q.type === "choice" && <Input value={(q.options ?? []).join(", ")} onChange={(e) => setQ(i, { options: splitList(e.target.value) })} placeholder="Choix séparés par des virgules" />}
              </div>
            ))}
            {j.screening_questions.length < 10 && <Button variant="outline" size="sm" onClick={() => set("screening_questions", [...j.screening_questions, { id: `s${uid()}`, text: "", type: "yesno", required: true }])}><Plus className="w-4 h-4 mr-1" />Ajouter une question</Button>}
          </TabsContent>

          <TabsContent value="entretien" className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Questions de l'entretien enregistré (12 maximum). Les mots-clés aident à évaluer les réponses ; le candidat ne les voit pas.</p>
              <Button size="sm" variant="outline" onClick={generate} disabled={gen || j.title.trim().length < 3}>{gen ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}Proposer des questions</Button>
            </div>
            {j.interview_questions.map((q, i) => (
              <div key={q.id || i} className="rounded-xl border border-foreground/10 p-3 space-y-2">
                <div className="flex gap-2"><Textarea aria-label="Question d'entretien" rows={2} value={q.text} maxLength={500} onChange={(e) => setI(i, { text: e.target.value })} />
                  <Button size="icon" variant="ghost" aria-label="Supprimer la question" onClick={() => set("interview_questions", j.interview_questions.filter((_, k) => k !== i))}><Trash2 className="w-4 h-4" /></Button></div>
                <div className="grid sm:grid-cols-[1fr_1.5fr_110px] gap-2">
                  <Input aria-label="Compétence évaluée" value={q.competency} maxLength={60} onChange={(e) => setI(i, { competency: e.target.value })} placeholder="Compétence" />
                  <Input aria-label="Mots-clés attendus" value={q.keywords.join(", ")} onChange={(e) => setI(i, { keywords: splitList(e.target.value).slice(0, 8) })} placeholder="Mots-clés attendus" />
                  <Input aria-label="Durée de réponse en secondes" type="number" min={30} max={600} value={q.seconds} onChange={(e) => setI(i, { seconds: Number(e.target.value) || 120 })} />
                </div>
              </div>
            ))}
            {j.interview_questions.length < 12 && <Button variant="outline" size="sm" onClick={() => set("interview_questions", [...j.interview_questions, { id: `q${j.interview_questions.length + 1}`, text: "", competency: "", keywords: [], seconds: 120 }])}><Plus className="w-4 h-4 mr-1" />Ajouter une question</Button>}
          </TabsContent>
        </Tabs>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}{j.id ? "Enregistrer" : j.is_active ? "Publier l'offre" : "Enregistrer le brouillon"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
