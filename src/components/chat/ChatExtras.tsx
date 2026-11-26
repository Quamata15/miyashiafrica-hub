// Chat extras: voice messages (#35), video calls (#34), quick replies (#23), translation (#45).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { aiAssist, AiNotConfigured } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Languages, Loader2, Mic, Square, Video } from "lucide-react";

type Send = (content: string, opts?: { message_type?: string; attachment_url?: string; attachment_name?: string }) => Promise<unknown>;
type Upload = (file: File) => Promise<{ url: string; name: string } | null>;

const MAX_SECONDS = 120;

export function VoiceRecorder({ upload, send }: { upload: Upload; send: Send }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>();

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast.error("L'enregistrement audio n'est pas pris en charge par ce navigateur");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 24000 } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timer.current);
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setRec(null);
        if (blob.size < 1500) return;               // tap without speaking
        setBusy(true);
        const ext = (r.mimeType || "audio/webm").includes("mp4") ? "m4a" : (r.mimeType || "").includes("ogg") ? "ogg" : "webm";
        const res = await upload(new File([blob], `vocal-${Date.now()}.${ext}`, { type: blob.type }));
        if (res) await send("🎤 Message vocal", { message_type: "audio", attachment_url: res.url, attachment_name: res.name });
        else toast.error("Envoi du message vocal impossible");
        setBusy(false);
      };
      r.start();
      setRec(r); setSecs(0);
      timer.current = window.setInterval(() => setSecs((s) => { if (s + 1 >= MAX_SECONDS) r.stop(); return s + 1; }), 1000);
    } catch { toast.error("Micro refusé"); }
  };
  useEffect(() => () => window.clearInterval(timer.current), []);

  if (busy) return <Button variant="ghost" size="icon" disabled aria-label="Envoi"><Loader2 className="w-5 h-5 animate-spin" /></Button>;
  return rec ? (
    <Button variant="destructive" size="sm" onClick={() => rec.stop()} aria-label="Arrêter et envoyer"><Square className="w-4 h-4 mr-1" />{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</Button>
  ) : (
    <Button variant="ghost" size="icon" onClick={start} aria-label="Enregistrer un message vocal"><Mic className="w-5 h-5" /></Button>
  );
}

export function VideoCallButton({ send }: { send: Send }) {
  const start = async () => {
    const room = `MIYASHI-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const url = `https://meet.jit.si/${room}`;
    await send("📹 Appel vidéo : rejoignez-moi", { message_type: "video_call", attachment_url: url, attachment_name: room });
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return <Button variant="ghost" size="icon" onClick={start} aria-label="Lancer un appel vidéo" title="Appel vidéo (gratuit, sans installation)"><Video className="w-5 h-5" /></Button>;
}

export function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<string[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("shops").select("quick_replies").eq("owner_id", user.id).maybeSingle().then(({ data }) => setReplies(((data?.quick_replies as string[]) ?? []).filter(Boolean)));
  }, [user]);
  if (!replies.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Réponses rapides">
      {replies.map((r) => <button key={r} type="button" onClick={() => onPick(r)} className="shrink-0 px-3 py-1 rounded-full border border-foreground/15 text-xs hover:border-primary/50">{r}</button>)}
    </div>
  );
}

export function TranslateMessage({ messageId }: { messageId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = (() => { try { return localStorage.getItem("miyashi_lang") || "fr"; } catch { return "fr"; } })();
  const run = async () => {
    setBusy(true);
    try { setText((await aiAssist<{ translation: string }>("translate", { message_id: messageId, lang })).translation); }
    catch (e) { toast.error(e instanceof AiNotConfigured ? "La traduction n'est pas encore activée" : (e as Error).message); }
    finally { setBusy(false); }
  };
  if (text) return <p className="text-sm mt-1 pt-1 border-t border-foreground/10 italic">{text}</p>;
  return (
    <button type="button" onClick={run} disabled={busy} className="mt-1 text-[11px] opacity-70 hover:opacity-100 inline-flex items-center gap-1">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}Traduire
    </button>
  );
}
