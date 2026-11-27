// Live video interview in the browser (WebRTC, peer to peer). Signalling goes through a
// Supabase Realtime channel named after a 64-character room code that only the two
// participants receive (join_interview_room). The recruiter sees the questions and the grid.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Loader2, AlertTriangle, ListChecks, ClipboardCheck, Wifi, WifiOff } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import Scorecard from "@/components/spaces/recruiter/Scorecard";
import { cleanError } from "@/components/spaces/kit";

type Room = { room: string; role: "host" | "guest"; duration_min: number; scheduled_at: string; other_name: string | null; job_title: string; questions: { id: string; text: string; competency?: string }[] };
type Signal = { type: "hello" | "offer" | "answer" | "ice" | "bye"; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; from: "host" | "guest" };

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = import.meta.env.VITE_TURN_URLS as string | undefined;
  if (turn) servers.push({ urls: turn.split(",").map((s) => s.trim()), username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL });
  return servers;
}

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<"waiting" | "connecting" | "connected" | "failed" | "ended">("waiting");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);
  const [panel, setPanel] = useState<"questions" | "grid" | null>(null);
  const local = useRef<HTMLVideoElement>(null);
  const remote = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const role = useRef<"host" | "guest">("guest");
  const pending = useRef<RTCIceCandidateInit[]>([]);

  const send = (s: Omit<Signal, "from">) => channel.current?.send({ type: "broadcast", event: "signal", payload: { ...s, from: role.current } });

  const makePeer = () => {
    pc.current?.close();
    const peer = new RTCPeerConnection({ iceServers: iceServers() });
    stream.current?.getTracks().forEach((t) => peer.addTrack(t, stream.current!));
    peer.onicecandidate = (e) => e.candidate && send({ type: "ice", candidate: e.candidate.toJSON() });
    peer.ontrack = (e) => { if (remote.current && remote.current.srcObject !== e.streams[0]) remote.current.srcObject = e.streams[0]; };
    peer.onconnectionstatechange = () => {
      const s = peer.connectionState;
      if (s === "connected") setState("connected");
      else if (s === "failed") setState("failed");
      else if (s === "connecting") setState("connecting");
      else if (s === "disconnected") setState("waiting");
    };
    pc.current = peer;
    return peer;
  };

  const call = async () => {
    const peer = makePeer();
    setState("connecting");
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    send({ type: "offer", sdp: offer });
  };

  const onSignal = async (s: Signal) => {
    if (s.from === role.current) return;
    if (s.type === "hello" && role.current === "host") return call();
    if (s.type === "offer" && role.current === "guest") {
      const peer = makePeer();
      setState("connecting");
      await peer.setRemoteDescription(s.sdp!);
      for (const c of pending.current.splice(0)) await peer.addIceCandidate(c).catch(() => undefined);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send({ type: "answer", sdp: answer });
    } else if (s.type === "answer" && role.current === "host" && pc.current) {
      await pc.current.setRemoteDescription(s.sdp!);
      for (const c of pending.current.splice(0)) await pc.current.addIceCandidate(c).catch(() => undefined);
    } else if (s.type === "ice" && s.candidate) {
      if (pc.current?.remoteDescription) await pc.current.addIceCandidate(s.candidate).catch(() => undefined);
      else pending.current.push(s.candidate);
    } else if (s.type === "bye") {
      pc.current?.close(); pc.current = null;
      if (remote.current) remote.current.srcObject = null;
      setState("waiting");
      toast.info("Votre interlocuteur a quitté la salle");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("join_interview_room", { p_id: id! });
      if (cancelled) return;
      if (error) return setError(cleanError(error.message));
      const r = data as Room;
      setRoom(r); role.current = r.role;
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 540 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        return setError("Autorisez l'accès à la caméra et au micro pour rejoindre l'entretien.");
      }
      if (local.current) local.current.srcObject = stream.current;
      const ch = supabase.channel(`interview:${r.room}`, { config: { broadcast: { self: false }, presence: { key: r.role } } });
      ch.on("broadcast", { event: "signal" }, ({ payload }) => onSignal(payload as Signal));
      ch.on("presence", { event: "sync" }, () => {
        const here = Object.keys(ch.presenceState());
        if (here.includes("host") && here.includes("guest") && role.current === "guest" && !pc.current) send({ type: "hello" });
      });
      ch.subscribe(async (status) => { if (status === "SUBSCRIBED") { await ch.track({ at: Date.now() }); if (role.current === "guest") send({ type: "hello" }); } });
      channel.current = ch;
    })();
    return () => {
      cancelled = true;
      send({ type: "bye" });
      if (channel.current) supabase.removeChannel(channel.current);
      pc.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (state !== "connected") return;
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  // No connection after 25 s: most often a strict network (carrier NAT) without a relay server.
  useEffect(() => {
    if (state !== "connecting") return;
    const t = window.setTimeout(() => setState((s) => (s === "connecting" ? "failed" : s)), 25000);
    return () => window.clearTimeout(t);
  }, [state]);

  const toggleMic = () => { stream.current?.getAudioTracks().forEach((t) => (t.enabled = !mic)); setMic(!mic); };
  const toggleCam = () => { stream.current?.getVideoTracks().forEach((t) => (t.enabled = !cam)); setCam(!cam); };
  const share = async () => {
    const sender = pc.current?.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return toast.error("Partage disponible une fois connecté");
    if (sharing) { await sender.replaceTrack(stream.current!.getVideoTracks()[0]); setSharing(false); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];
      await sender.replaceTrack(track);
      track.onended = () => { sender.replaceTrack(stream.current!.getVideoTracks()[0]); setSharing(false); };
      setSharing(true);
    } catch { /* cancelled */ }
  };
  const hangUp = () => {
    send({ type: "bye" });
    pc.current?.close(); pc.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    setState("ended");
    if (role.current === "host") setPanel("grid"); else navigate("/dashboard?espace=freelance&onglet=entretiens");
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-6"><div className="text-center space-y-4 max-w-md"><AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground" /><p className="font-medium">{error}</p><Button asChild><Link to="/dashboard">Retour au tableau de bord</Link></Button></div></div>
  );
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0"), ss = String(elapsed % 60).padStart(2, "0");
  const over = room && elapsed > room.duration_min * 60;

  return (
    <div className="min-h-screen bg-[hsl(240_25%_5%)] text-white flex flex-col">
      <SEOHead title="Entretien vidéo" description="Entretien MIYASHI" noindex />
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0"><p className="font-semibold truncate">{room?.job_title ?? "Entretien"}</p><p className="text-xs text-white/60 truncate">avec {room?.other_name ?? "…"}</p></div>
        <div className="flex items-center gap-3 text-sm">
          {state === "connected" ? <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-4 h-4" />Connecté</span> : state === "failed" ? <span className="flex items-center gap-1 text-red-400"><WifiOff className="w-4 h-4" />Échec</span> : <span className="flex items-center gap-1 text-white/70"><Loader2 className="w-4 h-4 animate-spin" />{state === "connecting" ? "Connexion…" : "En attente de l'autre personne"}</span>}
          <span className={`tabular-nums ${over ? "text-amber-400" : "text-white/70"}`}>{mm}:{ss}{room ? ` / ${room.duration_min}:00` : ""}</span>
        </div>
      </header>

      <main className="relative flex-1 mx-4 mb-4 rounded-3xl overflow-hidden bg-black">
        <video ref={remote} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
        {state !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            {state === "failed" ? (
              <div className="max-w-md space-y-3"><WifiOff className="w-10 h-10 mx-auto text-red-400" /><p className="font-medium">La connexion directe n'a pas abouti.</p>
                <p className="text-sm text-white/70">Certains réseaux mobiles bloquent les appels vidéo directs. Passez en Wi-Fi ou sur un autre réseau, puis réessayez.</p>
                <Button variant="secondary" onClick={() => (role.current === "host" ? call() : send({ type: "hello" }))}>Réessayer</Button></div>
            ) : state === "ended" ? <p className="text-white/70">Appel terminé.</p> : <p className="text-white/70">La salle est ouverte. L'appel démarre dès que {room?.other_name ?? "votre interlocuteur"} arrive.</p>}
          </div>
        )}
        <video ref={local} autoPlay muted playsInline className={`absolute bottom-4 right-4 w-32 sm:w-48 aspect-video rounded-xl object-cover border border-white/20 bg-black -scale-x-100 ${cam ? "" : "opacity-30"}`} />
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-3 pb-6">
        <Button size="icon" variant={mic ? "secondary" : "destructive"} className="rounded-full w-12 h-12" aria-label={mic ? "Couper le micro" : "Activer le micro"} onClick={toggleMic}>{mic ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}</Button>
        <Button size="icon" variant={cam ? "secondary" : "destructive"} className="rounded-full w-12 h-12" aria-label={cam ? "Couper la caméra" : "Activer la caméra"} onClick={toggleCam}>{cam ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}</Button>
        {"getDisplayMedia" in (navigator.mediaDevices ?? {}) && <Button size="icon" variant={sharing ? "default" : "secondary"} className="rounded-full w-12 h-12" aria-label="Partager l'écran" onClick={share}><MonitorUp className="w-5 h-5" /></Button>}
        {room?.role === "host" && <Button size="icon" variant="secondary" className="rounded-full w-12 h-12" aria-label="Questions" onClick={() => setPanel("questions")}><ListChecks className="w-5 h-5" /></Button>}
        {room?.role === "host" && <Button size="icon" variant="secondary" className="rounded-full w-12 h-12" aria-label="Grille d'évaluation" onClick={() => setPanel("grid")}><ClipboardCheck className="w-5 h-5" /></Button>}
        <Button size="icon" variant="destructive" className="rounded-full w-14 h-12" aria-label="Quitter l'appel" onClick={hangUp}><PhoneOff className="w-5 h-5" /></Button>
      </footer>

      <Sheet open={!!panel} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{panel === "questions" ? "Vos questions" : "Évaluation"}</SheetTitle></SheetHeader>
          {panel === "questions" ? (
            <ul className="mt-4 space-y-3">
              {(room?.questions ?? []).length === 0 && <p className="text-sm text-muted-foreground">Pas de questions préparées pour cette offre. Ajoutez-en dans l'offre (onglet Entretien).</p>}
              {(room?.questions ?? []).map((q) => (
                <li key={q.id} className="flex gap-3 text-sm"><Checkbox checked={asked.includes(q.id)} onCheckedChange={(v) => setAsked((a) => (v ? [...a, q.id] : a.filter((x) => x !== q.id)))} className="mt-0.5" aria-label="Question posée" />
                  <span className={asked.includes(q.id) ? "text-muted-foreground line-through" : ""}>{q.text}{q.competency ? <span className="block text-xs text-muted-foreground">{q.competency}</span> : null}</span></li>
              ))}
            </ul>
          ) : (
            <div className="mt-4"><Scorecard interviewId={id!} initial={null} complete={state === "ended"} onSaved={() => { if (state === "ended") navigate("/dashboard?espace=recruteur&onglet=entretiens"); }} />
              {state !== "ended" && <p className="mt-3 text-xs text-muted-foreground">Vous pouvez remplir la grille pendant l'appel ; elle sera finalisée quand vous raccrocherez.</p>}</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
