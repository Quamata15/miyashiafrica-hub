// Recorded interview with the assistant: consent, device check, then for each question:
// read it (aloud if wished), prepare, answer on camera with live transcription, review, send.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, Video, Mic, Volume2, Loader2, CheckCircle2, RotateCcw, Send, AlertTriangle, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/brand/BrandMark";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { audioMeter, pickRecorderType, speak, speechSupported, startTranscription, voiceActivity } from "@/lib/interviewMedia";
import { cleanError } from "@/components/spaces/kit";

type Q = { id: string; text: string; seconds: number };
type Phase = "loading" | "consent" | "check" | "prepare" | "record" | "review" | "uploading" | "finishing" | "done" | "error";
const PREP = 20;

export default function AiInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [edited, setEdited] = useState(false);
  const [retakes, setRetakes] = useState(0);

  const stream = useRef<MediaStream | null>(null);
  const meter = useRef<ReturnType<typeof audioMeter> | null>(null);
  const threshold = useRef(0.03);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const vad = useRef<ReturnType<typeof voiceActivity> | null>(null);
  const metrics = useRef<Record<string, unknown>>({});
  const stt = useRef<ReturnType<typeof startTranscription>>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const playback = useRef<HTMLVideoElement>(null);
  const hasSpeech = speechSupported();

  useEffect(() => {
    supabase.rpc("my_interviews").then(({ data, error }) => {
      const iv = (data as { id: string; kind: string; status: string; job_title: string }[] | null)?.find((x) => x.id === id);
      if (error || !iv || iv.kind !== "ai") { setError("Entretien introuvable."); return setPhase("error"); }
      if (["completed", "cancelled", "expired"].includes(iv.status)) { setError(iv.status === "completed" ? "Vous avez déjà passé cet entretien. Merci !" : iv.status === "expired" ? "Le délai pour passer cet entretien est dépassé." : "Cet entretien a été annulé."); return setPhase("error"); }
      setTitle(iv.job_title); setPhase("consent");
    });
    return () => { stream.current?.getTracks().forEach((t) => t.stop()); meter.current?.stop(); stt.current?.stop(); window.speechSynthesis?.cancel(); };
  }, [id]);

  // Live preview + mic level while checking, preparing and recording.
  useEffect(() => {
    if (!["check", "prepare", "record"].includes(phase) || !stream.current) return;
    if (preview.current && preview.current.srcObject !== stream.current) preview.current.srcObject = stream.current;
    const t = window.setInterval(() => meter.current && setLevel(meter.current.level()), 120);
    return () => window.clearInterval(t);
  }, [phase]);

  // Countdowns.
  useEffect(() => {
    if (phase !== "prepare" && phase !== "record") return;
    if (left <= 0) { if (phase === "prepare") startRecording(); else stopRecording(); return; }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, left]);

  const begin = async () => {
    const { data, error } = await supabase.rpc("start_ai_interview", { p_id: id!, p_consent: true });
    if (error) return toast.error(cleanError(error.message));
    const r = data as { questions: Q[]; answered: string[]; job_title: string };
    setQuestions(r.questions); setDone(r.answered ?? []);
    const first = r.questions.findIndex((q) => !(r.answered ?? []).includes(q.id));
    setIdx(first < 0 ? r.questions.length : first);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });
      meter.current = audioMeter(stream.current);
      // Calibrate on one second of room noise.
      const samples: number[] = [];
      await new Promise<void>((res) => { const t = window.setInterval(() => { samples.push(meter.current!.level()); if (samples.length >= 10) { window.clearInterval(t); res(); } }, 100); });
      threshold.current = Math.max(0.02, (samples.reduce((s, x) => s + x, 0) / samples.length) * 2.5);
      setPhase("check");
    } catch {
      toast.error("Autorisez l'accès à la caméra et au micro pour passer l'entretien.");
    }
  };

  const prepare = () => { setTranscript(""); setInterim(""); setEdited(false); blob.current = null; setLeft(PREP); setPhase("prepare"); if (questions[idx]) speak(questions[idx].text); };

  const startRecording = () => {
    window.speechSynthesis?.cancel();
    const type = pickRecorderType();
    chunks.current = [];
    const rec = new MediaRecorder(stream.current!, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 600_000, audioBitsPerSecond: 64_000 });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      blob.current = new Blob(chunks.current, { type: rec.mimeType || "video/webm" });
      if (playback.current) playback.current.src = URL.createObjectURL(blob.current);
    };
    rec.start(1000);
    recorder.current = rec;
    vad.current = voiceActivity(() => meter.current?.level() ?? 0, threshold.current);
    stt.current = startTranscription((f, i) => { setTranscript(f); setInterim(i); });
    setLeft(questions[idx].seconds);
    setPhase("record");
  };

  const stopRecording = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    metrics.current = vad.current?.stop() ?? {};
    const final = stt.current?.stop() ?? "";
    setTranscript((t) => (final || t).trim()); setInterim("");
    setPhase("review");
  };

  const send = async () => {
    const q = questions[idx];
    if (!blob.current) return;
    setPhase("uploading");
    const ext = blob.current.type.includes("mp4") ? "mp4" : "webm";
    const path = `${id}/${q.id}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("interviews").upload(path, blob.current, { contentType: blob.current.type.split(";")[0] });
    if (up.error) { toast.error("Envoi de la vidéo impossible. Vérifiez votre connexion et réessayez."); return setPhase("review"); }
    const { error } = await supabase.rpc("save_interview_answer", {
      p_id: id!, p_question_id: q.id, p_transcript: transcript.trim(), p_video_path: path, p_duration: Number(metrics.current.duration_s ?? 0),
      p_metrics: { ...metrics.current, transcript_source: hasSpeech ? (edited ? "auto_corrigee" : "auto") : "saisie", retakes },
    });
    if (error) { toast.error(cleanError(error.message)); return setPhase("review"); }
    const nextDone = [...done, q.id];
    setDone(nextDone); setRetakes(0);
    const next = questions.findIndex((x) => !nextDone.includes(x.id));
    if (next < 0) return finish();
    setIdx(next); prepare();
  };

  const finish = async () => {
    setPhase("finishing");
    const { error } = await supabase.rpc("finish_ai_interview", { p_id: id! });
    if (error) { toast.error(cleanError(error.message)); return setPhase("review"); }
    stream.current?.getTracks().forEach((t) => t.stop());
    supabase.functions.invoke("ai-assist", { body: { action: "interview_report", interview_id: id } });
    setPhase("done");
  };

  const q = questions[idx];
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-warm">
      <SEOHead title="Entretien enregistré" description="Entretien MIYASHI" noindex />
      <header className="container max-w-4xl px-4 py-4 flex items-center justify-between"><BrandLogo className="h-8" /><Button variant="ghost" size="sm" asChild><Link to="/dashboard?espace=freelance&onglet=entretiens"><ArrowLeft className="w-4 h-4 mr-1" />Mes entretiens</Link></Button></header>
      <main className="container max-w-4xl px-4 pb-16">{children}</main>
    </div>
  );

  if (phase === "loading") return shell(<p className="py-20 text-center text-muted-foreground">Chargement…</p>);
  if (phase === "error") return shell(<div className="py-20 text-center space-y-4"><AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground" /><p className="font-medium">{error}</p><Button asChild><Link to="/dashboard?espace=freelance&onglet=entretiens">Retour</Link></Button></div>);
  if (phase === "done") return shell(
    <div className="py-16 text-center space-y-4 max-w-lg mx-auto">
      <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-400" />
      <h1 className="font-display text-2xl font-bold">Merci, c'est terminé !</h1>
      <p className="text-muted-foreground">Le recruteur a reçu vos réponses pour « {title} ». Vous serez prévenu de la suite dans votre espace et par notification.</p>
      <Button onClick={() => navigate("/dashboard?espace=freelance&onglet=candidatures")}>Voir mes candidatures</Button>
    </div>
  );

  if (phase === "consent") return shell(
    <div className="max-w-2xl mx-auto rounded-3xl border border-foreground/10 bg-card/90 p-6 md:p-8 space-y-5">
      <div><p className="text-xs uppercase tracking-[0.25em] text-primary">Entretien enregistré</p><h1 className="font-display text-2xl md:text-3xl font-bold mt-1">{title}</h1></div>
      <ul className="space-y-3 text-sm">
        <li className="flex gap-3"><Clock className="w-5 h-5 text-primary shrink-0" /><span>Pour chaque question : {PREP} secondes de préparation, puis vous répondez face caméra dans le temps indiqué. Vous pouvez faire une pause entre deux questions et reprendre plus tard.</span></li>
        <li className="flex gap-3"><Video className="w-5 h-5 text-primary shrink-0" /><span>Vos réponses sont filmées et transcrites automatiquement. Seul le recruteur de cette offre peut les voir.</span></li>
        <li className="flex gap-3"><ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /><span>Seul le <b>contenu</b> de vos réponses est évalué (pertinence, exemples, résultats). Votre visage, vos émotions, votre accent et votre apparence ne sont <b>jamais</b> analysés. La décision appartient au recruteur.</span></li>
        <li className="flex gap-3"><Mic className="w-5 h-5 text-primary shrink-0" /><span>Installez-vous dans un endroit calme et éclairé. Le Wi-Fi est préférable aux données mobiles (environ 10 Mo par réponse).</span></li>
      </ul>
      {!hasSpeech && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-500">Ce navigateur ne transcrit pas la voix : après chaque réponse, vous pourrez résumer ce que vous avez dit. Chrome ou Edge transcrivent automatiquement.</p>}
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />J'accepte l'enregistrement vidéo et la transcription de mes réponses pour cette candidature.</label>
      <Button size="lg" className="w-full" disabled={!consent} onClick={begin}>Tester ma caméra et mon micro</Button>
    </div>
  );

  const progress = questions.length ? Math.round((done.length / questions.length) * 100) : 0;
  return shell(
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-2 flex-1" aria-label={`${done.length} sur ${questions.length} questions`} />
        <span className="text-sm text-muted-foreground tabular-nums">{Math.min(done.length + (phase === "check" ? 0 : 1), questions.length)}/{questions.length}</span>
      </div>
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-video">
          <video ref={preview} autoPlay muted playsInline className={`w-full h-full object-cover -scale-x-100 ${phase === "review" ? "hidden" : ""}`} />
          <video ref={playback} controls playsInline className={`w-full h-full object-contain ${phase === "review" ? "" : "hidden"}`} />
          {phase === "record" && <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"><span className="w-2 h-2 rounded-full bg-white animate-pulse" />REC {left}s</span>}
          {phase === "prepare" && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"><span className="text-center"><span className="block text-6xl font-bold tabular-nums">{left}</span><span className="text-sm">Préparation</span></span></span>}
          {["check", "prepare", "record"].includes(phase) && <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2"><Mic className="w-4 h-4 text-white" /><span className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden"><span className="block h-full bg-emerald-400 transition-all" style={{ width: `${Math.min(level * 900, 100)}%` }} /></span></div>}
        </div>

        <div className="rounded-3xl border border-foreground/10 bg-card/90 p-5 space-y-4">
          {phase === "check" ? (
            <>
              <p className="font-semibold">Vérification</p>
              <p className="text-sm text-muted-foreground">Vous vous voyez à gauche ? Parlez : la barre verte doit bouger. Si besoin, rapprochez-vous de la lumière et du micro.</p>
              <Button className="w-full" onClick={prepare} disabled={!q}>{done.length ? "Reprendre l'entretien" : "Commencer l'entretien"}</Button>
            </>
          ) : q ? (
            <>
              <p className="text-xs uppercase tracking-widest text-primary">Question {questions.indexOf(q) + 1}</p>
              <p className="text-lg font-semibold leading-snug">{q.text}</p>
              <p className="text-xs text-muted-foreground">Temps de réponse : {Math.round(q.seconds / 60 * 10) / 10} min. Conseil : la situation, ce que vous avez fait, le résultat.</p>
              {phase === "prepare" && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => speak(q.text)}><Volume2 className="w-4 h-4 mr-1" />Réécouter</Button><Button size="sm" onClick={startRecording}>Je suis prêt(e)</Button></div>}
              {phase === "record" && (
                <>
                  <div className="min-h-[96px] rounded-xl bg-muted/50 p-3 text-sm">{hasSpeech ? (transcript || interim ? <>{transcript} <span className="text-muted-foreground">{interim}</span></> : <span className="text-muted-foreground">Transcription en direct…</span>) : <span className="text-muted-foreground">Répondez face caméra.</span>}</div>
                  <Button className="w-full" variant="destructive" onClick={stopRecording}>Terminer ma réponse</Button>
                </>
              )}
              {(phase === "review" || phase === "uploading") && (
                <>
                  <p className="text-sm font-medium">{hasSpeech ? "Transcription (corrigez les erreurs de reconnaissance si besoin)" : "Résumez votre réponse en quelques phrases"}</p>
                  <Textarea rows={5} value={transcript} onChange={(e) => { setTranscript(e.target.value); setEdited(true); }} aria-label="Transcription de votre réponse" />
                  <p className="text-xs text-muted-foreground">Le recruteur voit aussi la vidéo : la transcription doit refléter ce que vous avez dit.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={retakes >= 1 || phase === "uploading"} onClick={() => { setRetakes((r) => r + 1); prepare(); }}><RotateCcw className="w-4 h-4 mr-1" />Recommencer {retakes >= 1 ? "(déjà fait)" : "(1 fois)"}</Button>
                    <Button className="flex-1" disabled={phase === "uploading"} onClick={send}>{phase === "uploading" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Valider</Button>
                  </div>
                </>
              )}
            </>
          ) : phase === "finishing" ? <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Envoi au recruteur…</p>
            : <Button className="w-full" onClick={finish}>Terminer l'entretien</Button>}
        </div>
      </div>
    </div>
  );
}
