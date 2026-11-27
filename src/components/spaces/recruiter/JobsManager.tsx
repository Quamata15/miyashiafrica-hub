// Recruiter's job offers: publish, pause, edit, duplicate, open the pipeline.
import { useEffect, useState } from "react";
import { Briefcase, Plus, Pencil, Pause, Play, Copy, Trash2, Users, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import JobEditor, { blankJob, type JobRow } from "./JobEditor";
import { CONTRACTS, REMOTE, Empty, Section, attempt, dateFr } from "../kit";

type Row = JobRow & { id: string; created_at: string; views: number; apps: { stage: string }[] };

export default function JobsManager({ onTab, autoNew }: { onTab: (tab: string, extra?: Record<string, string>) => void; autoNew?: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<JobRow | null>(null);
  const [company, setCompany] = useState("");

  const load = () => user && supabase.from("jobs").select("*, apps:applications(stage)").eq("employer_id", user.id).order("created_at", { ascending: false })
    .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  useEffect(() => {
    load();
    if (user) supabase.from("employer_profiles").select("company_name").eq("user_id", user.id).maybeSingle().then(({ data }) => setCompany(data?.company_name ?? ""));
  }, [user?.id]);
  useEffect(() => { if (autoNew) setEdit(blankJob(company)); }, [autoNew]);

  const toggle = async (r: Row) => { if (await attempt(() => supabase.from("jobs").update({ is_active: !r.is_active }).eq("id", r.id), r.is_active ? "Offre mise en pause" : "Offre publiée")) load(); };
  const remove = async (r: Row) => { if (await attempt(() => supabase.from("jobs").delete().eq("id", r.id), "Offre supprimée")) load(); };
  const rescore = async (id: string) => { const { data } = await supabase.rpc("rescore_job", { p_job_id: id }); if (data) await attempt(async () => ({ error: null }), `${data} candidature(s) recalculée(s)`); load(); };
  const asRow = (r: Row): JobRow => ({ ...blankJob(company), ...r, description: r.description ?? "", company_name: r.company_name ?? "", location: r.location ?? "", education_level: r.education_level ?? "",
    skills_required: r.skills_required ?? [], nice_to_have: r.nice_to_have ?? [], languages: r.languages ?? [], skill_weights: (r.skill_weights ?? {}) as Record<string, number>,
    screening_questions: r.screening_questions ?? [], interview_questions: r.interview_questions ?? [] });

  return (
    <Section title="Mes offres" description="Une offre précise attire les bons profils et rend le tri automatique plus juste."
      action={<Button onClick={() => setEdit(blankJob(company))}><Plus className="w-4 h-4 mr-1" />Nouvelle offre</Button>}>
      {rows === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : rows.length === 0 ? (
        <Empty icon={Briefcase} title="Aucune offre publiée" text="Décrivez le poste, les compétences attendues et vos questions de présélection." action={<Button onClick={() => setEdit(blankJob(company))}>Publier une offre</Button>} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const total = r.apps.length;
            const fresh = r.apps.filter((a) => a.stage === "new").length;
            const hired = r.apps.filter((a) => a.stage === "hired").length;
            return (
              <li key={r.id} className="rounded-xl border border-foreground/10 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{CONTRACTS[r.contract_type]} · {REMOTE[r.remote_mode]}{r.location ? ` · ${r.location}` : ""} · publiée le {dateFr(r.created_at)}{r.deadline ? ` · jusqu'au ${dateFr(r.deadline)}` : ""}</p>
                  </div>
                  <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "En ligne" : "En pause"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{r.views} vues</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{total} candidature(s){fresh ? ` dont ${fresh} nouvelle(s)` : ""}</span>
                  {hired > 0 && <span>{hired}/{r.openings} recruté(s)</span>}
                  {r.screening_questions?.length > 0 && <span>{r.screening_questions.length} question(s) de présélection</span>}
                  {r.blind_review && <span>Tri anonyme</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onTab("pipeline", { offre: r.id })}><Users className="w-4 h-4 mr-1" />Candidats ({total})</Button>
                  <Button size="sm" variant="outline" onClick={() => setEdit(asRow(r))}><Pencil className="w-4 h-4 mr-1" />Modifier</Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(r)}>{r.is_active ? <><Pause className="w-4 h-4 mr-1" />Pause</> : <><Play className="w-4 h-4 mr-1" />Publier</>}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ ...asRow(r), id: undefined, title: `${r.title} (copie)`, is_active: false })}><Copy className="w-4 h-4 mr-1" />Dupliquer</Button>
                  {total > 0 && <Button size="sm" variant="ghost" onClick={() => rescore(r.id)}><RefreshCw className="w-4 h-4 mr-1" />Recalculer</Button>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" aria-label="Supprimer l'offre"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Supprimer « {r.title} » ?</AlertDialogTitle><AlertDialogDescription>Les {total} candidature(s) et leurs entretiens seront supprimés. Préférez « Pause » pour garder l'historique.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => remove(r)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <JobEditor job={edit} open={!!edit} onOpenChange={(o) => !o && setEdit(null)} onSaved={(id, existing) => { load(); if (existing) rescore(id); }} />
    </Section>
  );
}
