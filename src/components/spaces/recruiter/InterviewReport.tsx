// Report of a recorded interview: overall assessment, each answer (video, transcript,
// evaluation, communication measures) and the recruiter's own grid.
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Play, CheckCircle2, XCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Scorecard, { type ScorecardData } from "./Scorecard";
import { ScoreBadge, cleanError, dateFr, signedUrl } from "../kit";

type Eval = { score: number; source: string; keywords_hit: string[]; coverage: number; structure: { context: boolean; example: boolean; result: boolean };
  communication: { words: number; words_per_minute: number; hesitations: number; latency_s: number | null; pauses: number | null; longest_pause_s: number | null; speaking_ratio: number | null }; feedback: string };
type Answer = { question_id: string; question: string; transcript: string | null; video_path: string | null; duration_s: number | null; evaluation: Eval | null };
type Report = { score: number; recommendation: string; summary: string; strengths: string[]; concerns: string[]; competencies: { name: string; score: number }[]; source: string; generated_at: string;
  answered: number; questions: number; communication: { words_per_minute: number | null; hesitations: number; latency_s: number | null; speaking_ratio: number | null } };
type Iv = { id: string; status: string; completed_at: string | null; report: Report | null; scorecard: ScorecardData | null; employer_notes: string | null; candidate: string; job_title: string };

function Video({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  return url ? <video src={url} controls playsInline className="w-full rounded-lg bg-black aspect-video" />
    : <Button size="sm" variant="outline" onClick={async () => setUrl(await signedUrl("interviews", path, 1800))}><Play className="w-4 h-4 mr-1" />Lire la vidéo</Button>;
}

export default function InterviewReport({ iv, open, onOpenChange, onChanged }: { iv: Iv | null; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const load = (id: string) => supabase.from("interview_answers").select("question_id, question, transcript, video_path, duration_s, evaluation").eq("interview_id", id).order("question_id")
    .then(({ data }) => setAnswers((data ?? []) as unknown as Answer[]));
  useEffect(() => { if (iv && open) { setReport(iv.report); load(iv.id); } }, [iv?.id, open]);
  if (!iv) return null;

  const generate = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action: "interview_report", interview_id: iv.id } });
    setBusy(false);
    if (error || data?.error) return toast.error(cleanError(data?.error ?? "Rapport impossible pour le moment"));
    setReport(data); load(iv.id); onChanged();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-left"><SheetTitle>{iv.candidate} · {iv.job_title}</SheetTitle><p className="text-sm text-muted-foreground">Entretien enregistré terminé le {dateFr(iv.completed_at, true)}</p></SheetHeader>

        <div className="mt-4 space-y-5">
          {!report ? (
            <div className="rounded-xl border border-dashed border-foreground/20 p-4 text-sm">
              <p>Le rapport évalue chaque réponse : pertinence, exemple concret, résultat, points attendus, débit et hésitations.</p>
              <Button className="mt-3" onClick={generate} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Générer le rapport</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-foreground/10 p-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><ScoreBadge score={report.score} /><Badge variant={report.recommendation === "à rencontrer" ? "default" : report.recommendation === "pas adapté" ? "destructive" : "secondary"}>{report.recommendation}</Badge>
                <span className="text-xs text-muted-foreground">{report.source === "ia" ? "Évaluation IA" : "Évaluation automatique"} · {report.answered}/{report.questions} réponses</span>
                <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualiser"}</Button></div>
              <p>{report.summary}</p>
              {report.competencies?.length > 0 && <div className="space-y-2">{report.competencies.map((c) => <div key={c.name}><div className="flex justify-between text-xs"><span>{c.name}</span><span>{c.score}/5</span></div><Progress value={(c.score / 5) * 100} className="h-1.5" /></div>)}</div>}
              {report.strengths?.length > 0 && <div><p className="font-medium">Points forts</p><ul className="list-disc pl-5 text-muted-foreground">{report.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>}
              {report.concerns?.length > 0 && <div><p className="font-medium">À approfondir</p><ul className="list-disc pl-5 text-muted-foreground">{report.concerns.map((s) => <li key={s}>{s}</li>)}</ul></div>}
              <p className="text-xs text-muted-foreground">Communication : {report.communication?.words_per_minute ?? "—"} mots/min · {report.communication?.hesitations ?? 0} hésitation(s){report.communication?.latency_s != null ? ` · ${report.communication.latency_s} s avant de répondre en moyenne` : ""}{report.communication?.speaking_ratio != null ? ` · parole ${Math.round(report.communication.speaking_ratio * 100)} % du temps` : ""}</p>
            </div>
          )}

          <Accordion type="multiple">
            {answers.map((a, i) => (
              <AccordionItem key={a.question_id} value={a.question_id}>
                <AccordionTrigger className="text-left text-sm"><span className="flex-1">Q{i + 1}. {a.question}</span>{a.evaluation && <span className="ml-2 shrink-0 tabular-nums text-xs font-semibold">{a.evaluation.score}/10</span>}</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  {a.video_path && <Video path={a.video_path} />}
                  <div><p className="text-xs text-muted-foreground mb-1">Transcription automatique{a.duration_s ? ` · ${Math.round(a.duration_s)} s` : ""}</p><p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{a.transcript || "(pas de transcription : écoutez la vidéo)"}</p></div>
                  {a.evaluation && (
                    <div className="space-y-1.5">
                      <p>{a.evaluation.feedback}</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {(["context", "example", "result"] as const).map((k) => <span key={k} className="flex items-center gap-1">{a.evaluation!.structure[k] ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}{k === "context" ? "Contexte" : k === "example" ? "Exemple concret" : "Résultat"}</span>)}
                      </div>
                      {a.evaluation.keywords_hit?.length > 0 && <p className="text-xs">Points attendus abordés : {a.evaluation.keywords_hit.join(", ")} ({a.evaluation.coverage} %)</p>}
                      <p className="text-xs text-muted-foreground">{a.evaluation.communication.words} mots · {a.evaluation.communication.words_per_minute} mots/min · {a.evaluation.communication.hesitations} hésitation(s){a.evaluation.communication.latency_s != null ? ` · ${a.evaluation.communication.latency_s} s avant de parler` : ""}{a.evaluation.communication.longest_pause_s != null ? ` · plus longue pause ${a.evaluation.communication.longest_pause_s} s` : ""}</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="flex gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><Info className="w-4 h-4 shrink-0" />Seul le contenu des réponses est évalué. Les visages, les émotions, l'accent et l'apparence ne sont jamais analysés : ces techniques sont peu fiables et discriminatoires. Écoutez les vidéos avant de décider.</p>

          <div className="rounded-xl border border-foreground/10 p-4"><p className="font-semibold mb-3">Votre évaluation</p><Scorecard interviewId={iv.id} initial={iv.scorecard} notes={iv.employer_notes} complete={false} onSaved={onChanged} /></div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
