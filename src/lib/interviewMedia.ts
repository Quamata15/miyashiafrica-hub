// Browser media helpers for interviews: recording format, live transcription, voice activity.

/** A recording format the browser supports (webm on Chrome/Firefox/Android, mp4 on Safari/iOS). */
export function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4;codecs=avc1,mp4a", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
}

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};

export const speechSupported = () => typeof window !== "undefined" && !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

/** Continuous French transcription. `onText(final, interim)` is called as the person speaks. */
export function startTranscription(onText: (finalText: string, interim: string) => void, lang = "fr-FR") {
  const Ctor = ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined;
  if (!Ctor) return null;
  let finalText = "";
  let stopped = false;
  const rec = new Ctor();
  rec.lang = lang; rec.continuous = true; rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += (finalText ? " " : "") + r[0].transcript.trim();
      else interim += r[0].transcript;
    }
    onText(finalText, interim);
  };
  // Chrome ends recognition after a silence: restart until we stop on purpose.
  rec.onend = () => { if (!stopped) { try { rec.start(); } catch { /* already started */ } } };
  rec.onerror = () => { /* network or no-speech: onend restarts */ };
  try { rec.start(); } catch { return null; }
  return { stop: () => { stopped = true; try { rec.stop(); } catch { /* not running */ } return finalText; }, text: () => finalText };
}

/** Microphone level 0..1 (RMS), sampled on demand. */
export function audioMeter(stream: MediaStream) {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  return {
    level: () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); },
    stop: () => { try { src.disconnect(); ctx.close(); } catch { /* closed */ } },
  };
}

/** Tracks speaking vs silence while recording: response latency, pauses, speaking time. */
export function voiceActivity(level: () => number, threshold: number) {
  const started = performance.now();
  let firstSpeech: number | null = null;
  let speakingMs = 0;
  let silenceStart: number | null = null;
  let pauses = 0;
  let longest = 0;
  let last = started;
  const timer = window.setInterval(() => {
    const now = performance.now();
    const dt = now - last; last = now;
    const speaking = level() > threshold;
    if (speaking) {
      speakingMs += dt;
      if (firstSpeech === null) firstSpeech = now;
      if (silenceStart !== null) {
        const gap = now - silenceStart;
        if (gap >= 1500 && firstSpeech !== null && silenceStart > firstSpeech) { pauses++; longest = Math.max(longest, gap); }
        silenceStart = null;
      }
    } else if (silenceStart === null) silenceStart = now;
  }, 100);
  return {
    stop: () => {
      window.clearInterval(timer);
      const total = (performance.now() - started) / 1000;
      return {
        duration_s: Math.round(total * 10) / 10,
        latency_s: firstSpeech === null ? null : Math.round(((firstSpeech - started) / 1000) * 10) / 10,
        speaking_s: Math.round((speakingMs / 1000) * 10) / 10,
        speaking_ratio: total ? Math.round((speakingMs / 1000 / total) * 100) / 100 : 0,
        pauses, longest_pause_s: Math.round((longest / 1000) * 10) / 10,
      };
    },
  };
}

/** Reads a question aloud in French when the device has a voice for it. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; u.rate = 0.95;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("fr"));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}
