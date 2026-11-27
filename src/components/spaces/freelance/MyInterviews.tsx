// The candidate's interviews: join the live video room, or take the recorded interview.
import { useNavigate } from "react-router-dom";
import { Video, Bot, CalendarClock, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, Section, attempt, dateFr, useRpc } from "../kit";

type Iv = { id: string; kind: "live" | "ai"; status: string; scheduled_at: string | null; duration_min: number; expires_at: string | null; external_url: string | null; consent_at: string | null;
  completed_at: string | null; questions_count: number; answered: number; job_title: string; company: string | null };

export const STATUS_IV: Record<string, string> = { scheduled: "Prévu", in_progress: "En cours", completed: "Terminé", cancelled: "Annulé", expired: "Expiré" };

export default function MyInterviews() {
  const navigate = useNavigate();
  const { data, loading, reload } = useRpc<Iv[]>("my_interviews");
  const cancel = async (id: string) => { if (await attempt(() => supabase.rpc("cancel_interview", { p_id: id, p_reason: "Annulé par le candidat" }), "Entretien annulé, le recruteur est prévenu")) reload(); };
  const now = Date.now();

  return (
    <div className="space-y-4">
      <Section title="Mes entretiens" description="Entretien vidéo en direct à l'heure prévue, ou entretien enregistré à passer quand vous voulez avant l'échéance.">
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !data?.length ? (
          <Empty icon={CalendarClock} title="Aucun entretien prévu" text="Quand un recruteur vous invite, l'entretien apparaît ici et vous recevez une notification." />
        ) : (
          <ul className="space-y-3">
            {data.map((i) => {
              const open = ["scheduled", "in_progress"].includes(i.status);
              const start = i.scheduled_at ? new Date(i.scheduled_at).getTime() : 0;
              const canJoin = i.kind === "live" && open && now >= start - 15 * 60000 && now <= start + (i.duration_min + 120) * 60000;
              return (
                <li key={i.id} className="rounded-xl border border-foreground/10 p-4 flex flex-wrap items-center gap-3">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${i.kind === "live" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400"}`}>{i.kind === "live" ? <Video className="w-5 h-5" /> : <Bot className="w-5 h-5" />}</span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold">{i.job_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {i.company ?? "Entreprise"} · {i.kind === "live" ? `Vidéo en direct le ${dateFr(i.scheduled_at, true)} (${i.duration_min} min)` : `Entretien enregistré · ${i.questions_count} questions${i.expires_at ? ` · avant le ${dateFr(i.expires_at, true)}` : ""}`}
                    </p>
                    {i.kind === "ai" && i.answered > 0 && open && <p className="text-xs text-muted-foreground">{i.answered}/{i.questions_count} réponses enregistrées : vous pouvez reprendre.</p>}
                  </div>
                  <Badge variant={i.status === "completed" ? "default" : i.status === "cancelled" || i.status === "expired" ? "destructive" : "secondary"}>{STATUS_IV[i.status] ?? i.status}</Badge>
                  <div className="flex gap-2">
                    {i.kind === "live" && open && (canJoin ? <Button size="sm" onClick={() => navigate(`/entretien/${i.id}`)}><Video className="w-4 h-4 mr-1" />Rejoindre</Button>
                      : <Button size="sm" variant="outline" disabled>Salle ouverte 15 min avant</Button>)}
                    {i.kind === "live" && open && i.external_url && <Button size="sm" variant="outline" asChild><a href={i.external_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Lien du recruteur</a></Button>}
                    {i.kind === "ai" && open && <Button size="sm" onClick={() => navigate(`/entretien-ia/${i.id}`)}><Bot className="w-4 h-4 mr-1" />{i.answered ? "Reprendre" : "Commencer"}</Button>}
                    {open && <Button size="sm" variant="ghost" onClick={() => cancel(i.id)}><X className="w-4 h-4 mr-1" />Annuler</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <div className="rounded-2xl border border-foreground/10 bg-card/80 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Bien se préparer</p>
        <p>Endroit calme et éclairé, téléphone ou ordinateur chargé, connexion stable (le Wi-Fi est préférable aux données mobiles).</p>
        <p>Pour l'entretien enregistré : lisez la question, prenez le temps de préparation, répondez avec un exemple concret (la situation, ce que vous avez fait, le résultat).</p>
        <p>Vos enregistrements ne sont visibles que par le recruteur de l'offre. Votre apparence, votre accent et vos émotions ne sont pas évalués.</p>
      </div>
    </div>
  );
}
