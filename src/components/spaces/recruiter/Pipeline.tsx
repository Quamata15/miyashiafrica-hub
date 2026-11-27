// Candidate pipeline for one job: columns by stage (drag and drop), list view, filters,
// multi-select with a message, side-by-side comparison, automatic analysis of the whole job.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, LayoutGrid, List, Sparkles, Loader2, AlertTriangle, MessageSquare, Video, ArrowRightLeft, Scale, X, Search, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import CandidateDrawer, { Stars, type PipelineRow } from "./CandidateDrawer";
import MoveDialog from "./MoveDialog";
import ScheduleInterviewDialog from "./ScheduleInterviewDialog";
import type { SQ } from "./JobEditor";
import { STAGES, Empty, ScoreBadge, Section, attempt, cleanError, dateFr, fcfa, stageOf } from "../kit";

type Job = { id: string; title: string; screening_questions: SQ[]; is_active: boolean };
const COLUMNS = STAGES.filter((s) => s.key !== "withdrawn");

function Card({ r, selected, onSelect, onOpen }: { r: PipelineRow; selected: boolean; onSelect: (v: boolean) => void; onOpen: () => void }) {
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", r.id); e.dataTransfer.effectAllowed = "move"; }}
      className={`group rounded-xl border bg-card p-3 text-sm cursor-grab active:cursor-grabbing transition-colors ${selected ? "border-primary" : "border-foreground/10 hover:border-primary/40"}`}>
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} aria-label={`Sélectionner ${r.full_name ?? "le candidat"}`} className="mt-1" />
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7"><AvatarImage src={r.avatar_url ?? undefined} alt="" /><AvatarFallback className="text-xs">{(r.full_name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
            <span className="font-medium truncate">{r.full_name ?? "Candidat"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">{r.title ?? "—"}{r.experience_years != null ? ` · ${r.experience_years} an(s)` : ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ScoreBadge score={r.match_score} />
            {r.knocked_out && <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500"><AlertTriangle className="w-3 h-3" />Éliminatoire</span>}
            {r.ai_summary && <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[11px] text-violet-400">{r.ai_summary.recommendation}</span>}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <Stars value={r.rating} />
            <span className="flex items-center gap-2">{r.notes > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{r.notes}</span>}{r.interviews > 0 && <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />{r.interviews}</span>}</span>
          </div>
          {r.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.tags.slice(0, 3).map((t) => <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>)}</div>}
        </button>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const jobId = params.get("offre") ?? jobs?.[0]?.id ?? "";
  const job = jobs?.find((j) => j.id === jobId);
  const [rows, setRows] = useState<PipelineRow[] | null>(null);
  const [view, setView] = useState<"board" | "list">(() => (typeof window !== "undefined" && window.innerWidth < 900 ? "list" : "board"));
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [hideKo, setHideKo] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [move, setMove] = useState<{ ids: string[]; stage: string | null } | null>(null);
  const [schedule, setSchedule] = useState<PipelineRow | null>(null);
  const [compare, setCompare] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("jobs").select("id, title, screening_questions, is_active").eq("employer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setJobs((data ?? []) as unknown as Job[]));
  }, [user?.id]);

  const load = useCallback(() => {
    if (!jobId) return;
    supabase.rpc("get_job_pipeline", { p_job_id: jobId }).then(({ data, error }) => {
      if (error) { toast.error(cleanError(error.message)); setRows([]); return; }
      setRows((data ?? []) as unknown as PipelineRow[]);
    });
  }, [jobId]);
  useEffect(() => { setRows(null); setSelected(new Set()); load(); }, [load]);

  const list = useMemo(() => (rows ?? []).filter((r) =>
    (!hideKo || !r.knocked_out) && (r.match_score ?? 0) >= Number(minScore) &&
    (!q || `${r.full_name ?? ""} ${r.title ?? ""} ${(r.skills ?? []).join(" ")} ${r.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, minScore, hideKo]);
  const open = rows?.find((r) => r.id === openId) ?? null;

  const drop = async (stage: string, id: string) => {
    const r = rows?.find((x) => x.id === id);
    if (!r || r.stage === stage) return;
    if (stage === "rejected") return setMove({ ids: [id], stage });
    setRows((rs) => rs?.map((x) => (x.id === id ? { ...x, stage } : x)) ?? null);
    if (!(await attempt(() => supabase.rpc("move_applications", { p_ids: [id], p_stage: stage }), `${r.full_name ?? "Candidat"} → ${stageOf(stage).label}`))) load();
  };
  const toggle = (id: string, v: boolean) => setSelected((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });

  const analyzeAll = async () => {
    setAnalyzing(true);
    let remaining = 1, rounds = 0, done = 0;
    while (remaining > 0 && rounds < 4) {
      const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action: "screen_job", job_id: jobId } });
      if (error || data?.error) { toast.error("Analyse interrompue, réessayez"); break; }
      remaining = data.remaining; done += data.done; rounds++;
      if (!data.done) break;
    }
    setAnalyzing(false);
    toast.success(`${done} candidature(s) analysée(s)${remaining ? `, ${remaining} restante(s)` : ""}`);
    load();
  };

  if (jobs === null) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!jobs.length) return <Section title="Candidats"><Empty icon={Briefcase} title="Publiez une offre pour recevoir des candidatures" /></Section>;

  const chosen = (rows ?? []).filter((r) => selected.has(r.id));
  return (
    <Section title="Candidats" description="Glissez une carte d'une colonne à l'autre pour la faire avancer : le candidat est prévenu. Cliquez pour ouvrir le dossier."
      action={<Select value={jobId} onValueChange={(v) => { params.set("offre", v); setParams(params, { replace: true }); }}>
        <SelectTrigger className="w-60" aria-label="Offre"><SelectValue /></SelectTrigger>
        <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}{j.is_active ? "" : " (en pause)"}</SelectItem>)}</SelectContent></Select>}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input aria-label="Rechercher" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, compétence, étiquette" /></div>
        <Select value={minScore} onValueChange={setMinScore}><SelectTrigger className="w-36" aria-label="Score minimum"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="0">Tous les scores</SelectItem><SelectItem value="50">50 et plus</SelectItem><SelectItem value="75">75 et plus</SelectItem></SelectContent></Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={hideKo} onCheckedChange={setHideKo} />Masquer les éliminés</label>
        <div className="flex rounded-lg border border-foreground/10 p-0.5">
          <Button size="sm" variant={view === "board" ? "secondary" : "ghost"} aria-label="Vue en colonnes" onClick={() => setView("board")}><LayoutGrid className="w-4 h-4" /></Button>
          <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="Vue en liste" onClick={() => setView("list")}><List className="w-4 h-4" /></Button>
        </div>
        <Button size="sm" variant="outline" onClick={analyzeAll} disabled={analyzing || !rows?.length}>{analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Analyser tout</Button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card p-2 shadow-lg">
          <span className="text-sm font-medium px-2">{selected.size} sélectionné(s)</span>
          <Button size="sm" onClick={() => setMove({ ids: [...selected], stage: null })}><ArrowRightLeft className="w-4 h-4 mr-1" />Déplacer avec un message</Button>
          <Button size="sm" variant="outline" disabled={selected.size < 2 || selected.size > 4} onClick={() => setCompare(true)}><Scale className="w-4 h-4 mr-1" />Comparer</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {rows === null ? <p className="text-sm text-muted-foreground">Chargement des candidatures…</p> : rows.length === 0 ? (
        <Empty icon={Users} title="Pas encore de candidature" text="Partagez l'offre : les candidatures arrivent ici, triées par correspondance." />
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((c) => {
            const items = list.filter((r) => r.stage === c.key);
            return (
              <div key={c.key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); drop(c.key, e.dataTransfer.getData("text/plain")); }}
                className="w-56 shrink-0 rounded-2xl bg-muted/30 p-2">
                <p className="flex items-center justify-between px-1 pb-2 text-sm font-medium"><span className={`rounded-full px-2 py-0.5 text-xs ${c.tone}`}>{c.label}</span><span className="text-muted-foreground tabular-nums">{items.length}</span></p>
                <div className="space-y-2 min-h-[80px]">{items.map((r) => <Card key={r.id} r={r} selected={selected.has(r.id)} onSelect={(v) => toggle(r.id, v)} onOpen={() => setOpenId(r.id)} />)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggle(r.id, !!v)} aria-label={`Sélectionner ${r.full_name ?? "le candidat"}`} />
              <button className="flex-1 min-w-[160px] text-left" onClick={() => setOpenId(r.id)}>
                <p className="font-medium">{r.full_name ?? "Candidat"} {r.knocked_out && <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500" aria-label="Question éliminatoire non remplie" />}</p>
                <p className="text-xs text-muted-foreground">{r.title ?? "—"} · reçue le {dateFr(r.created_at)}</p>
              </button>
              <ScoreBadge score={r.match_score} />
              <span className={`rounded-full px-2 py-0.5 text-xs ${stageOf(r.stage).tone}`}>{stageOf(r.stage).label}</span>
              <Select value={r.stage} onValueChange={(v) => drop(v, r.id)} disabled={r.stage === "withdrawn"}>
                <SelectTrigger className="w-36 h-8" aria-label="Changer d'étape"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}{r.stage === "withdrawn" && <SelectItem value="withdrawn">Retirée</SelectItem>}</SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}
      {(rows ?? []).some((r) => r.stage === "withdrawn") && <p className="mt-3 text-xs text-muted-foreground">{rows!.filter((r) => r.stage === "withdrawn").length} candidature(s) retirée(s) par les candidats (vue liste).</p>}

      <CandidateDrawer row={open} jobQuestions={job?.screening_questions ?? []} open={!!open} onOpenChange={(o) => !o && setOpenId(null)} onChanged={load}
        onMove={(stage) => open && setMove({ ids: [open.id], stage })} onSchedule={() => open && setSchedule(open)} />
      <MoveDialog ids={move?.ids ?? []} stage={move?.stage ?? null} jobTitle={job?.title ?? ""} open={!!move} onOpenChange={(o) => !o && setMove(null)} onDone={() => { setSelected(new Set()); load(); }} />
      <ScheduleInterviewDialog applicationId={schedule?.id ?? null} jobId={jobId} candidate={schedule?.full_name ?? "le candidat"} open={!!schedule} onOpenChange={(o) => !o && setSchedule(null)} onDone={load} />

      <Dialog open={compare} onOpenChange={setCompare}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Comparer {chosen.length} candidats</DialogTitle></DialogHeader>
          <table className="w-full text-sm">
            <tbody>
              {([
                ["Candidat", (r: PipelineRow) => <b>{r.full_name ?? "Candidat"}</b>],
                ["Score", (r: PipelineRow) => <ScoreBadge score={r.match_score} />],
                ["Analyse", (r: PipelineRow) => r.ai_summary?.recommendation ?? "—"],
                ["Compétences trouvées", (r: PipelineRow) => r.match_breakdown?.skills?.matched.join(", ") || "—"],
                ["Manquantes", (r: PipelineRow) => r.match_breakdown?.skills?.missing.join(", ") || "—"],
                ["Expérience", (r: PipelineRow) => `${r.experience_years ?? 0} an(s)`],
                ["Langues", (r: PipelineRow) => (r.languages ?? []).join(", ") || "—"],
                ["Lieu", (r: PipelineRow) => r.location ?? "—"],
                ["Prétentions", (r: PipelineRow) => (r.expected_salary != null ? fcfa(r.expected_salary) : r.proposed_rate != null ? fcfa(r.proposed_rate) : "—")],
                ["Disponibilité", (r: PipelineRow) => (r.available_from ? dateFr(r.available_from) : "—")],
                ["Éliminatoire", (r: PipelineRow) => (r.knocked_out ? "Oui" : "Non")],
                ["Votre note", (r: PipelineRow) => <Stars value={r.rating} />],
                ["Étape", (r: PipelineRow) => stageOf(r.stage).label],
              ] as [string, (r: PipelineRow) => React.ReactNode][]).map(([label, f]) => (
                <tr key={label} className="border-b border-border align-top"><th className="py-2 pr-3 text-left font-medium text-muted-foreground w-40">{label}</th>{chosen.map((r) => <td key={r.id} className="py-2 pr-3">{f(r)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
