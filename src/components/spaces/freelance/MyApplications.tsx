// The candidate's applications: where each one stands, the recruiter's messages, next step.
import { useNavigate } from "react-router-dom";
import { FileText, Video, Bot, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Empty, ScoreBadge, Section, attempt, dateFr, stageOf, useRpc } from "../kit";

type App = { id: string; job_id: string; job_title: string; company: string | null; stage: string; stage_label: string; created_at: string; stage_changed_at: string; match_score: number | null;
  is_active: boolean; next_interview: string | null; pending_ai_interview: string | null; last_message: string | null };

const PATH = ["new", "screening", "shortlisted", "interview", "offer", "hired"];

export default function MyApplications({ onTab }: { onTab: (tab: string) => void }) {
  const navigate = useNavigate();
  const { data, loading, reload } = useRpc<App[]>("my_applications");
  const withdraw = async (id: string) => { if (await attempt(() => supabase.from("applications").update({ stage: "withdrawn" }).eq("id", id), "Candidature retirée")) reload(); };

  return (
    <Section title="Mes candidatures" description="Vous êtes prévenu à chaque étape. Les notes internes du recruteur ne sont pas visibles ; ses messages, si.">
      {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !data?.length ? (
        <Empty icon={FileText} title="Aucune candidature" text="Postulez aux offres qui vous correspondent le mieux." action={<Button onClick={() => onTab("offres")}>Voir les offres pour vous</Button>} />
      ) : (
        <ul className="space-y-3">
          {data.map((a) => {
            const st = stageOf(a.stage);
            const idx = PATH.indexOf(a.stage);
            const closed = ["rejected", "withdrawn", "hired"].includes(a.stage);
            return (
              <li key={a.id} className="rounded-xl border border-foreground/10 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold">{a.job_title}</p>
                    <p className="text-sm text-muted-foreground">{a.company ?? "Entreprise"} · envoyée le {dateFr(a.created_at)}{!a.is_active && !closed ? " · offre clôturée" : ""}</p>
                  </div>
                  <ScoreBadge score={a.match_score} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.tone}`}>{a.stage_label}</span>
                </div>
                {idx >= 0 && (
                  <ol className="mt-3 grid grid-cols-6 gap-1" aria-label="Avancement de la candidature">
                    {PATH.map((k, i) => <li key={k}><span className={`block h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} /><span className="sr-only">{stageOf(k).candidate}</span></li>)}
                  </ol>
                )}
                {a.last_message && <p className="mt-3 text-sm rounded-lg bg-muted/50 p-3 whitespace-pre-wrap">{a.last_message}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.pending_ai_interview && <Button size="sm" onClick={() => navigate(`/entretien-ia/${a.pending_ai_interview}`)}><Bot className="w-4 h-4 mr-1" />Passer l'entretien enregistré</Button>}
                  {a.next_interview && <Button size="sm" variant="outline" onClick={() => onTab("entretiens")}><Video className="w-4 h-4 mr-1" />Entretien le {dateFr(a.next_interview, true)}</Button>}
                  {a.stage === "hired" && <Badge className="bg-emerald-600">Félicitations ! Le recruteur va vous contacter.</Badge>}
                  {!closed && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Undo2 className="w-4 h-4 mr-1" />Retirer</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Retirer cette candidature ?</AlertDialogTitle><AlertDialogDescription>Le recruteur ne pourra plus la faire avancer. Vous ne pourrez pas repostuler à cette offre.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Garder</AlertDialogCancel><AlertDialogAction onClick={() => withdraw(a.id)}>Retirer</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
