// Apply to a job: the recruiter's questions, CV (saved one or a new upload), message, rate.
// Used by the freelance space and by the public job board.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, FileCheck2, Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CONTRACTS, PERIODS, REMOTE, cleanError, fcfa } from "../kit";

type Question = { id: string; text: string; type: "yesno" | "text" | "number" | "choice"; required?: boolean; options?: string[] };
type Job = { id: string; title: string; description: string | null; company_name: string | null; contract_type: string; remote_mode: string; location: string | null; pay_period: string;
  budget_min: number | null; budget_max: number | null; screening_questions: Question[]; deadline: string | null };

const MAX_CV = 10 * 1024 * 1024;

export default function ApplyDialog({ jobId, open, onOpenChange, onApplied }: { jobId: string | null; open: boolean; onOpenChange: (o: boolean) => void; onApplied?: (score: number) => void }) {
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [letter, setLetter] = useState("");
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState("");
  const [savedCv, setSavedCv] = useState<string | null>(null);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    setJob(null); setAnswers({}); setLetter(""); setRate(""); setFrom("");
    supabase.from("jobs").select("id, title, description, company_name, contract_type, remote_mode, location, pay_period, budget_min, budget_max, screening_questions, deadline").eq("id", jobId).maybeSingle()
      .then(({ data }) => setJob(data as unknown as Job));
    supabase.rpc("record_job_view", { p_job_id: jobId });
    if (user) supabase.from("freelance_profiles").select("cv_path").eq("user_id", user.id).maybeSingle().then(({ data }) => { setSavedCv(data?.cv_path ?? null); setCvPath(data?.cv_path ?? null); });
  }, [open, jobId, user?.id]);

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_CV) return toast.error("CV trop lourd (10 Mo maximum)");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${user.id}/cv-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { contentType: file.type || "application/pdf" });
    setUploading(false);
    if (error) return toast.error("Envoi du CV impossible : formats acceptés PDF, Word, JPG, PNG");
    setCvPath(path);
    if (!savedCv) { await supabase.from("freelance_profiles").upsert({ user_id: user.id, cv_path: path }, { onConflict: "user_id" }); setSavedCv(path); }
    toast.success("CV ajouté");
  };

  const missing = (job?.screening_questions ?? []).filter((q) => q.required && !(answers[q.id] ?? "").trim());
  const canSend = !!job && letter.trim().length >= 30 && missing.length === 0 && !sending;

  const send = async () => {
    if (!job) return;
    setSending(true);
    const isMission = ["freelance", "mission"].includes(job.contract_type);
    const { data, error } = await supabase.rpc("apply_to_job", {
      p_job_id: job.id, p_cover_letter: letter.trim(), p_answers: answers, p_cv_path: cvPath ?? undefined,
      p_proposed_rate: isMission && rate ? Number(rate) : undefined, p_expected_salary: !isMission && rate ? Number(rate) : undefined, p_available_from: from || undefined,
    });
    setSending(false);
    if (error) return toast.error(cleanError(error.message));
    const r = data as { match_score: number; knocked_out: boolean };
    toast.success(r.knocked_out ? "Candidature envoyée. Certaines réponses ne correspondent pas aux critères du recruteur." : `Candidature envoyée · correspondance ${r.match_score}/100`);
    onApplied?.(r.match_score);
    onOpenChange(false);
  };

  if (!user) return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Connectez-vous pour postuler</DialogTitle></DialogHeader>
      <Button asChild><Link to="/auth">Se connecter ou créer un compte</Link></Button></DialogContent></Dialog>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? `Postuler : ${job.title}` : "Chargement…"}</DialogTitle>
          {job && <DialogDescription>{[job.company_name, CONTRACTS[job.contract_type], REMOTE[job.remote_mode], job.location].filter(Boolean).join(" · ")}
            {(job.budget_min || job.budget_max) ? ` · ${job.budget_min ? fcfa(job.budget_min) : ""}${job.budget_max ? ` – ${fcfa(job.budget_max)}` : ""} par ${PERIODS[job.pay_period] ?? "mission"}` : ""}</DialogDescription>}
        </DialogHeader>
        {job && (
          <div className="space-y-5">
            {job.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto rounded-lg bg-muted/40 p-3">{job.description}</p>}

            {job.screening_questions.length > 0 && (
              <div className="space-y-3">
                <p className="font-medium text-sm">Questions du recruteur</p>
                {job.screening_questions.map((q) => (
                  <div key={q.id}>
                    <Label className="text-sm">{q.text}{q.required && <span className="text-destructive"> *</span>}</Label>
                    {q.type === "yesno" ? (
                      <RadioGroup className="flex gap-4 mt-1" value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                        {["oui", "non"].map((v) => <label key={v} className="flex items-center gap-2 text-sm"><RadioGroupItem value={v} />{v === "oui" ? "Oui" : "Non"}</label>)}
                      </RadioGroup>
                    ) : q.type === "choice" && q.options?.length ? (
                      <RadioGroup className="flex flex-wrap gap-4 mt-1" value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                        {q.options.map((v) => <label key={v} className="flex items-center gap-2 text-sm"><RadioGroupItem value={v} />{v}</label>)}
                      </RadioGroup>
                    ) : (
                      <Input className="mt-1" type={q.type === "number" ? "number" : "text"} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>CV</Label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {cvPath ? <span className="flex items-center gap-1 text-sm text-emerald-400"><FileCheck2 className="w-4 h-4" />{cvPath === savedCv ? "CV de votre profil joint" : "Nouveau CV joint"}</span> : <span className="text-sm text-muted-foreground">Aucun CV (facultatif mais conseillé)</span>}
                <label className="inline-flex">
                  <input type="file" className="sr-only" accept=".pdf,.doc,.docx,image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  <span className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{cvPath ? "Changer" : "Joindre un CV"}</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Visible uniquement par ce recruteur et ceux à qui vous postulez.</p>
            </div>

            <div>
              <Label>Votre message *</Label>
              <Textarea rows={6} maxLength={5000} value={letter} onChange={(e) => setLetter(e.target.value)}
                placeholder="Pourquoi ce poste ? Ce que vous avez déjà réalisé de similaire, avec un exemple concret." />
              <p className="text-xs text-muted-foreground mt-1">{letter.trim().length < 30 ? `Encore ${30 - letter.trim().length} caractères minimum` : `${letter.length}/5000`}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>{["freelance", "mission"].includes(job.contract_type) ? "Votre tarif (FCFA)" : "Salaire souhaité (FCFA / mois)"}</Label><Input type="number" min={0} step={1000} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
              <div><Label>Disponible à partir du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            </div>

            {missing.length > 0 && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Répondez aux questions marquées d'un astérisque.</p>}
            <p className="text-xs text-muted-foreground">Un recruteur ne vous demandera jamais d'argent. Signalez toute demande de paiement.</p>
          </div>
        )}
        <DialogFooter>
          <Button disabled={!canSend} onClick={send}>{sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Envoyer ma candidature</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
