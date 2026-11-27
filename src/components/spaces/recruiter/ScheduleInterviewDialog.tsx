// Schedule a live video interview or send a recorded interview with the assistant.
import { useEffect, useState } from "react";
import { Loader2, Video, Bot, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { IQ } from "./JobEditor";
import { attempt } from "../kit";

const nextHour = () => { const d = new Date(Date.now() + 26 * 3600000); d.setMinutes(0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function ScheduleInterviewDialog({ applicationId, jobId, candidate, open, onOpenChange, onDone }: { applicationId: string | null; jobId: string; candidate: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [kind, setKind] = useState<"live" | "ai">("live");
  const [when, setWhen] = useState(nextHour());
  const [duration, setDuration] = useState("30");
  const [url, setUrl] = useState("");
  const [days, setDays] = useState("5");
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<IQ[]>([]);
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWhen(nextHour()); setMessage(""); setUrl("");
    supabase.from("jobs").select("interview_questions").eq("id", jobId).maybeSingle().then(({ data }) => setQuestions((data?.interview_questions as IQ[]) ?? []));
  }, [open, jobId]);

  const generate = async () => {
    setGen(true);
    const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action: "interview_questions", job_id: jobId, count: 6 } });
    setGen(false);
    if (error || !data?.questions) return toast.error("Génération impossible pour le moment");
    setQuestions(data.questions);
  };

  const go = async () => {
    if (!applicationId) return;
    setBusy(true);
    const ok = await attempt(() => supabase.rpc("schedule_interview", {
      p_application_id: applicationId, p_kind: kind, p_scheduled_at: kind === "live" ? new Date(when).toISOString() : undefined, p_duration: Number(duration),
      p_questions: kind === "ai" && questions.length ? questions : undefined, p_expires_days: Number(days), p_external_url: kind === "live" && url ? url : undefined, p_message: message.trim() || undefined,
    }), kind === "live" ? "Entretien programmé : le candidat est prévenu" : "Entretien envoyé au candidat");
    setBusy(false);
    if (ok) { onDone(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Entretien avec {candidate}</DialogTitle><DialogDescription>Le candidat reçoit une notification et retrouve l'entretien dans son espace.</DialogDescription></DialogHeader>
        <Tabs value={kind} onValueChange={(v) => setKind(v as "live" | "ai")}>
          <TabsList className="grid grid-cols-2"><TabsTrigger value="live"><Video className="w-4 h-4 mr-1" />Vidéo en direct</TabsTrigger><TabsTrigger value="ai"><Bot className="w-4 h-4 mr-1" />Enregistré (assistant)</TabsTrigger></TabsList>
          <TabsContent value="live" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Appel vidéo dans le navigateur, sans logiciel à installer. Vous aurez vos questions et une grille d'évaluation pendant l'appel.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date et heure</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
              <div><Label>Durée</Label><Select value={duration} onValueChange={setDuration}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["15", "30", "45", "60", "90"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Lien externe (facultatif)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… si vous préférez votre outil habituel" /></div>
          </TabsContent>
          <TabsContent value="ai" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Le candidat répond en vidéo aux questions, quand il veut avant l'échéance. Vous recevez les vidéos, la transcription et une évaluation de chaque réponse. Son accord est demandé avant l'enregistrement.</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{questions.length ? `${questions.length} question(s)` : "Questions par défaut adaptées au poste"}</p>
              <Button size="sm" variant="outline" onClick={generate} disabled={gen}>{gen ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}Proposer</Button>
            </div>
            {questions.length > 0 && <ol className="list-decimal pl-5 space-y-1 text-sm max-h-40 overflow-y-auto">{questions.map((q, i) => <li key={i}>{q.text} <span className="text-xs text-muted-foreground">({q.seconds} s)</span></li>)}</ol>}
            <div><Label>À passer sous</Label><Select value={days} onValueChange={setDays}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["2", "3", "5", "7", "14"].map((d) => <SelectItem key={d} value={d}>{d} jours</SelectItem>)}</SelectContent></Select></div>
          </TabsContent>
        </Tabs>
        <div><Label>Message au candidat (facultatif)</Label><Textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <DialogFooter><Button onClick={go} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{kind === "live" ? "Programmer" : "Envoyer l'entretien"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
