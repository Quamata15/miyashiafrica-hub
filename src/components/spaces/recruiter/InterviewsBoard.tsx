// Recruiter's interviews: live ones to join, recorded ones to evaluate.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Bot, CalendarClock, X, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InterviewReport from "./InterviewReport";
import type { ScorecardData } from "./Scorecard";
import { Empty, ScoreBadge, Section, attempt, dateFr } from "../kit";
import { STATUS_IV } from "../freelance/MyInterviews";

type Row = { id: string; kind: "live" | "ai"; status: string; scheduled_at: string | null; duration_min: number; expires_at: string | null; completed_at: string | null; candidate_id: string; job_id: string;
  report: { score: number; recommendation: string } | null; scorecard: ScorecardData | null; employer_notes: string | null; job: { title: string } | null; candidate: string; job_title: string };

export default function InterviewsBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"todo" | "upcoming" | "all">("todo");
  const [report, setReport] = useState<Row | null>(null);

  const load = () => user && supabase.from("interviews").select("id, kind, status, scheduled_at, duration_min, expires_at, completed_at, candidate_id, job_id, report, scorecard, employer_notes, job:jobs(title)")
    .eq("employer_id", user.id).order("created_at", { ascending: false }).limit(200).then(async ({ data }) => {
      const list = (data ?? []) as unknown as Row[];
      const ids = [...new Set(list.map((r) => r.candidate_id))];
      const { data: ps } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
      setRows(list.map((r) => ({ ...r, candidate: ps?.find((p) => p.user_id === r.candidate_id)?.full_name ?? "Candidat", job_title: r.job?.title ?? "Offre" })));
    });
  useEffect(() => { load(); }, [user?.id]);

  const cancel = async (id: string) => { if (await attempt(() => supabase.rpc("cancel_interview", { p_id: id, p_reason: "Annulé par le recruteur" }), "Entretien annulé, le candidat est prévenu")) load(); };
  const now = Date.now();
  const list = (rows ?? []).filter((r) => filter === "all" ? true : filter === "upcoming" ? ["scheduled", "in_progress"].includes(r.status) : (r.kind === "ai" && r.status === "completed" && !r.scorecard) || (r.kind === "live" && ["scheduled", "in_progress"].includes(r.status)));

  return (
    <Section title="Entretiens" description="Rejoignez vos entretiens vidéo et évaluez les entretiens enregistrés avec la même grille pour tous.">
      <div className="flex flex-wrap gap-2 mb-4">
        {([["todo", "À traiter"], ["upcoming", "À venir"], ["all", "Tous"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>)}
      </div>
      {rows === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
        <Empty icon={CalendarClock} title="Rien à traiter" text="Programmez un entretien depuis le dossier d'un candidat (onglet Candidats)." />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const start = r.scheduled_at ? new Date(r.scheduled_at).getTime() : 0;
            const canJoin = r.kind === "live" && ["scheduled", "in_progress"].includes(r.status) && now >= start - 15 * 60000 && now <= start + (r.duration_min + 120) * 60000;
            return (
              <li key={r.id} className="rounded-xl border border-foreground/10 p-4 flex flex-wrap items-center gap-3">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${r.kind === "live" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400"}`}>{r.kind === "live" ? <Video className="w-5 h-5" /> : <Bot className="w-5 h-5" />}</span>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold">{r.candidate}</p>
                  <p className="text-sm text-muted-foreground">{r.job_title} · {r.kind === "live" ? `vidéo le ${dateFr(r.scheduled_at, true)} (${r.duration_min} min)` : r.status === "completed" ? `enregistré, terminé le ${dateFr(r.completed_at, true)}` : `enregistré, à passer avant le ${dateFr(r.expires_at, true)}`}</p>
                </div>
                {r.report && <ScoreBadge score={r.report.score} />}
                {r.scorecard?.average && <Badge variant="outline">Grille {r.scorecard.average}/5</Badge>}
                <Badge variant={r.status === "completed" ? "default" : ["cancelled", "expired"].includes(r.status) ? "destructive" : "secondary"}>{STATUS_IV[r.status] ?? r.status}</Badge>
                <div className="flex gap-2">
                  {r.kind === "live" && ["scheduled", "in_progress"].includes(r.status) && <Button size="sm" disabled={!canJoin} onClick={() => navigate(`/entretien/${r.id}`)}><Video className="w-4 h-4 mr-1" />{canJoin ? "Rejoindre" : "Ouvre 15 min avant"}</Button>}
                  {r.kind === "ai" && r.status === "completed" && <Button size="sm" onClick={() => setReport(r)}><FileSearch className="w-4 h-4 mr-1" />Voir et évaluer</Button>}
                  {["scheduled", "in_progress"].includes(r.status) && <Button size="sm" variant="ghost" aria-label="Annuler l'entretien" onClick={() => cancel(r.id)}><X className="w-4 h-4" /></Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <InterviewReport iv={report ? { ...report, report: report.report as never } : null} open={!!report} onOpenChange={(o) => !o && setReport(null)} onChanged={load} />
    </Section>
  );
}
