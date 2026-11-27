// Everything about one application: file, match explained, analysis, timeline and notes, interviews.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MessageSquare, CalendarPlus, Sparkles, Loader2, Star, AlertTriangle, CheckCircle2, XCircle, Send, Mail, Phone, ExternalLink, Video, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { STAGES, ScoreBadge, attempt, cleanError, dateFr, fcfa, openConversation, signedUrl, splitList, stageOf } from "../kit";
import type { SQ } from "./JobEditor";

export type PipelineRow = {
  id: string; freelance_id: string; stage: string; created_at: string; stage_changed_at: string; match_score: number | null; knocked_out: boolean; rating: number | null; tags: string[];
  cover_letter: string | null; proposed_rate: number | null; expected_salary: number | null; available_from: string | null; answers: Record<string, string>; cv_path: string | null; reject_reason: string | null;
  full_name: string | null; avatar_url: string | null; location: string | null; title: string | null; skills: string[] | null; experience_years: number | null; languages: string[] | null;
  hourly_rate: number | null; portfolio_urls: string[] | null; email: string | null; phone: string | null; interviews: number; notes: number;
  match_breakdown: { skills?: { points: number; max: number; matched: string[]; missing: string[] }; experience?: { points: number; max: number; required: number; have: number }; languages?: { points: number; max: number }; location?: { points: number; max: number }; screening?: { points: number; max: number; failed: { text: string; expected: string; answer: string }[] }; nice_to_have?: { points: number; matched: string[] } };
  ai_summary: { summary: string; strengths: string[]; concerns: string[]; questions: string[]; recommendation: string; fit_score: number; source: string; generated_at: string } | null;
};
type Ev = { id: number; kind: string; body: string | null; from_stage: string | null; to_stage: string | null; internal: boolean; created_at: string };
type Iv = { id: string; kind: string; status: string; scheduled_at: string | null; report: { score: number; recommendation: string } | null; scorecard: { average?: number; recommendation?: string } | null };

function Bar({ label, points, max }: { label: string; points: number; max: number }) {
  return <div><div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="tabular-nums">{Math.round(points)}/{max}</span></div><Progress value={(points / max) * 100} className="h-2" /></div>;
}

export function Stars({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  if (!onChange) return (
    <span className="flex" role="img" aria-label={value ? `Note ${value} sur 5` : "Pas encore noté"}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 mx-0.5 ${value && n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}
    </span>
  );
  return (
    <div className="flex" role={onChange ? "radiogroup" : undefined} aria-label="Note">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} role={onChange ? "radio" : undefined} aria-checked={value === n} aria-label={`${n} étoile(s)`} onClick={() => onChange?.(n)} className="p-0.5 disabled:cursor-default">
          <Star className={`w-4 h-4 ${value && n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}

export default function CandidateDrawer({ row, jobQuestions, open, onOpenChange, onChanged, onMove, onSchedule }: {
  row: PipelineRow | null; jobQuestions: SQ[]; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void; onMove: (stage: string) => void; onSchedule: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Ev[]>([]);
  const [ivs, setIvs] = useState<Iv[]>([]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<PipelineRow["ai_summary"]>(null);

  const loadSide = (id: string) => {
    supabase.from("application_events").select("id, kind, body, from_stage, to_stage, internal, created_at").eq("application_id", id).order("created_at", { ascending: false }).then(({ data }) => setEvents((data ?? []) as Ev[]));
    supabase.from("interviews").select("id, kind, status, scheduled_at, report, scorecard").eq("application_id", id).order("created_at", { ascending: false }).then(({ data }) => setIvs((data ?? []) as unknown as Iv[]));
  };
  useEffect(() => { if (row && open) { loadSide(row.id); setTags(row.tags.join(", ")); setSummary(row.ai_summary); setNote(""); } }, [row?.id, open]);
  if (!row) return null;

  const b = row.match_breakdown ?? {};
  const st = stageOf(row.stage);
  const rate = async (v: number) => { if (await attempt(() => supabase.from("applications").update({ rating: v }).eq("id", row.id))) onChanged(); };
  const saveTags = async () => { if (await attempt(() => supabase.from("applications").update({ tags: splitList(tags).slice(0, 10) }).eq("id", row.id), "Étiquettes enregistrées")) onChanged(); };
  const addNote = async () => { if (await attempt(() => supabase.rpc("add_application_note", { p_id: row.id, p_body: note }), "Note ajoutée")) { setNote(""); loadSide(row.id); onChanged(); } };
  const analyze = async () => {
    setAnalyzing(true);
    const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action: "screen_application", application_id: row.id } });
    setAnalyzing(false);
    if (error || data?.error) return toast.error(cleanError(data?.error ?? "Analyse impossible pour le moment"));
    setSummary(data); loadSide(row.id); onChanged();
  };
  const openCv = async () => { if (row.cv_path) { const u = await signedUrl("cvs", row.cv_path); if (u) window.open(u, "_blank"); } };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12"><AvatarImage src={row.avatar_url ?? undefined} alt="" /><AvatarFallback>{(row.full_name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{row.full_name ?? "Candidat"}</SheetTitle>
              <p className="text-sm text-muted-foreground">{[row.title, row.location, row.experience_years != null ? `${row.experience_years} an(s) d'exp.` : null].filter(Boolean).join(" · ")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2"><ScoreBadge score={row.match_score} /><span className={`rounded-full px-2 py-0.5 text-xs ${st.tone}`}>{st.label}</span><Stars value={row.rating} onChange={rate} /></div>
            </div>
          </div>
        </SheetHeader>
        {row.knocked_out && <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-500"><AlertTriangle className="w-4 h-4" />Une question éliminatoire n'est pas remplie.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {row.stage !== "withdrawn" && <Button size="sm" onClick={() => onMove(row.stage === "new" || row.stage === "screening" ? "shortlisted" : row.stage === "shortlisted" ? "interview" : row.stage === "interview" ? "offer" : "hired")}>Étape suivante</Button>}
          {row.stage !== "withdrawn" && <Button size="sm" variant="outline" onClick={onSchedule}><CalendarPlus className="w-4 h-4 mr-1" />Entretien</Button>}
          {user && <Button size="sm" variant="outline" onClick={() => openConversation(user.id, row.freelance_id, navigate)}><MessageSquare className="w-4 h-4 mr-1" />Message</Button>}
          {!["rejected", "withdrawn"].includes(row.stage) && <Button size="sm" variant="ghost" onClick={() => onMove("rejected")}>Ne pas retenir</Button>}
        </div>

        <Tabs defaultValue="dossier" className="mt-4">
          <TabsList className="grid grid-cols-4"><TabsTrigger value="dossier">Dossier</TabsTrigger><TabsTrigger value="match">Score</TabsTrigger><TabsTrigger value="analyse">Analyse</TabsTrigger><TabsTrigger value="suivi">Suivi</TabsTrigger></TabsList>

          <TabsContent value="dossier" className="space-y-4 pt-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {row.cv_path ? <Button size="sm" variant="outline" onClick={openCv}><FileText className="w-4 h-4 mr-1" />Ouvrir le CV</Button> : <span className="text-muted-foreground">Pas de CV joint</span>}
              {(row.portfolio_urls ?? []).slice(0, 3).map((u) => <Button key={u} size="sm" variant="ghost" asChild><a href={u} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Portfolio</a></Button>)}
            </div>
            {(row.email || row.phone) ? <p className="flex flex-wrap gap-4">{row.email && <a className="flex items-center gap-1 text-primary" href={`mailto:${row.email}`}><Mail className="w-4 h-4" />{row.email}</a>}{row.phone && <a className="flex items-center gap-1 text-primary" href={`tel:${row.phone}`}><Phone className="w-4 h-4" />{row.phone}</a>}</p>
              : <p className="text-xs text-muted-foreground">Les coordonnées s'affichent une fois la candidature présélectionnée.</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {row.proposed_rate != null && <p>Tarif proposé : <b>{fcfa(row.proposed_rate)}</b></p>}
              {row.expected_salary != null && <p>Salaire souhaité : <b>{fcfa(row.expected_salary)}</b></p>}
              {row.available_from && <p>Disponible le : <b>{dateFr(row.available_from)}</b></p>}
              <p>Reçue le : <b>{dateFr(row.created_at)}</b></p>
            </div>
            {!!row.skills?.length && <div className="flex flex-wrap gap-1">{row.skills.map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
            <div><p className="font-medium mb-1">Message</p><p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{row.cover_letter}</p></div>
            {jobQuestions.length > 0 && (
              <div><p className="font-medium mb-1">Réponses aux questions</p>
                <ul className="space-y-1">{jobQuestions.map((q) => {
                  const failed = b.screening?.failed?.some((f) => f.text === q.text);
                  return <li key={q.id} className="flex gap-2">{failed ? <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}<span><span className="text-muted-foreground">{q.text}</span> — {row.answers?.[q.id] || "(pas de réponse)"}</span></li>;
                })}</ul>
              </div>
            )}
            <div className="flex gap-2"><Input aria-label="Étiquettes" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Étiquettes : à rappeler, anglais, Lomé" /><Button size="sm" variant="outline" onClick={saveTags}>OK</Button></div>
          </TabsContent>

          <TabsContent value="match" className="space-y-3 pt-2 text-sm">
            <p className="text-muted-foreground">Calcul automatique à partir de vos critères. C'est un repère : lisez toujours le dossier.</p>
            {b.skills && <Bar label="Compétences" points={b.skills.points} max={b.skills.max} />}
            {b.experience && <Bar label={`Expérience (${b.experience.have} / ${b.experience.required} ans)`} points={b.experience.points} max={b.experience.max} />}
            {b.languages && <Bar label="Langues" points={b.languages.points} max={b.languages.max} />}
            {b.location && <Bar label="Lieu" points={b.location.points} max={b.location.max} />}
            {b.screening && <Bar label="Questions" points={b.screening.points} max={b.screening.max} />}
            {!!b.skills?.matched.length && <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Trouvées : {b.skills.matched.join(", ")}</p>}
            {!!b.skills?.missing.length && <p className="flex gap-2"><XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />Non trouvées : {b.skills.missing.join(", ")}</p>}
            {!!b.nice_to_have?.matched.length && <p>Atouts : {b.nice_to_have.matched.join(", ")} (+{b.nice_to_have.points})</p>}
          </TabsContent>

          <TabsContent value="analyse" className="space-y-3 pt-2 text-sm">
            <Button size="sm" onClick={analyze} disabled={analyzing}>{analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}{summary ? "Refaire l'analyse" : "Analyser la candidature"}</Button>
            {summary ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Badge variant={summary.recommendation === "à rencontrer" ? "default" : summary.recommendation === "pas adapté" ? "destructive" : "secondary"}>{summary.recommendation}</Badge><ScoreBadge score={summary.fit_score} /><span className="text-xs text-muted-foreground">{summary.source === "ia" ? "Analyse IA" : "Analyse automatique"} · {dateFr(summary.generated_at, true)}</span></div>
                <p>{summary.summary}</p>
                {!!summary.strengths.length && <div><p className="font-medium">Points forts</p><ul className="list-disc pl-5 text-muted-foreground">{summary.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>}
                {!!summary.concerns.length && <div><p className="font-medium">Points d'attention</p><ul className="list-disc pl-5 text-muted-foreground">{summary.concerns.map((s) => <li key={s}>{s}</li>)}</ul></div>}
                {!!summary.questions.length && <div><p className="font-medium">Questions à poser</p><ul className="list-disc pl-5 text-muted-foreground">{summary.questions.map((s) => <li key={s}>{s}</li>)}</ul></div>}
                <p className="text-xs text-muted-foreground">L'analyse ne tient compte ni de l'âge, ni du genre, ni de l'origine, ni de la photo. Elle aide, vous décidez.</p>
              </div>
            ) : <p className="text-muted-foreground">Résumé des points forts, des points à vérifier et des questions à poser en entretien.</p>}
          </TabsContent>

          <TabsContent value="suivi" className="space-y-4 pt-2 text-sm">
            {ivs.length > 0 && (
              <div><p className="font-medium mb-1">Entretiens</p>
                <ul className="space-y-1">{ivs.map((i) => (
                  <li key={i.id} className="flex items-center gap-2">{i.kind === "live" ? <Video className="w-4 h-4 text-sky-400" /> : <Bot className="w-4 h-4 text-violet-400" />}
                    <span className="flex-1">{i.kind === "live" ? `Vidéo ${dateFr(i.scheduled_at, true)}` : "Enregistré"} · {i.status}{i.report ? ` · ${i.report.recommendation} (${i.report.score}/100)` : ""}{i.scorecard?.average ? ` · grille ${i.scorecard.average}/5` : ""}</span>
                  </li>
                ))}</ul>
              </div>
            )}
            <div className="flex gap-2"><Textarea rows={2} aria-label="Note privée" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note privée (jamais visible du candidat)" /><Button size="icon" aria-label="Ajouter la note" disabled={!note.trim()} onClick={addNote}><Send className="w-4 h-4" /></Button></div>
            <ol className="space-y-2 border-l border-border pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ${e.internal ? "bg-muted-foreground" : "bg-primary"}`} />
                  <p className="text-xs text-muted-foreground">{dateFr(e.created_at, true)} · {e.kind === "note" ? "Note privée" : e.kind === "stage" ? `${stageOf(e.from_stage ?? "new").label} → ${stageOf(e.to_stage ?? "new").label}` : e.kind === "applied" ? "Candidature" : e.kind === "ai" ? "Analyse" : e.kind === "interview" ? "Entretien" : e.kind}{!e.internal && e.kind !== "applied" ? " · vu par le candidat" : ""}</p>
                  {e.body && <p className="whitespace-pre-wrap">{e.body}</p>}
                </li>
              ))}
            </ol>
            {row.reject_reason && <p className="text-xs text-muted-foreground">Motif interne : {row.reject_reason}</p>}
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-xs text-muted-foreground">Étapes possibles : {STAGES.filter((s) => s.key !== "withdrawn").map((s) => s.label).join(" · ")}</p>
      </SheetContent>
    </Sheet>
  );
}
