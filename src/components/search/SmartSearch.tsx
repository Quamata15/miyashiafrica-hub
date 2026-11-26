// Voice search (#16), photo search (#15) and "search by meaning" results (#44).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiAssist, AiNotConfigured, fileToDataUrl } from "@/lib/ai";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, Mic, Sparkles } from "lucide-react";
import { TileGrid, type TileProduct } from "@/components/commerce/ProductTiles";

type SR = { start: () => void; stop: () => void; lang: string; interimResults: boolean; onresult: (e: any) => void; onerror: (e: any) => void; onend: () => void };

export function VoiceSearchButton({ onResult, className }: { onResult: (text: string) => void; className?: string }) {
  const { flag } = usePrefs();
  const [on, setOn] = useState(false);
  const rec = useRef<SR | null>(null);
  const Ctor = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  if (!Ctor || !flag("voice_search")) return null;
  const start = () => {
    const r: SR = new Ctor();
    r.lang = "fr-FR"; r.interimResults = false;
    r.onresult = (e) => { const t = e.results?.[0]?.[0]?.transcript; if (t) onResult(t); };
    r.onerror = (e) => { if (e.error !== "aborted" && e.error !== "no-speech") toast.error("Micro indisponible"); };
    r.onend = () => setOn(false);
    rec.current = r; setOn(true); r.start();
  };
  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={() => (on ? rec.current?.stop() : start())} aria-label={on ? "Arrêter l'écoute" : "Recherche vocale"} title="Recherche vocale">
      <Mic className={`w-5 h-5 ${on ? "text-destructive animate-pulse" : ""}`} />
    </Button>
  );
}

export function ImageSearchButton({ onResult, className }: { onResult: (text: string) => void; className?: string }) {
  const { flag } = usePrefs();
  const [busy, setBusy] = useState(false);
  if (!flag("image_search")) return null;
  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await fileToDataUrl(file, 1024);
      const r = await aiAssist<{ query: string; alternatives: string[] }>("image_search", { image });
      onResult(r.query);
      toast.success(`Recherche : « ${r.query} »`);
    } catch (e) {
      toast.error(e instanceof AiNotConfigured ? "La recherche par photo n'est pas encore activée" : (e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <label className={`inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-foreground/[0.06] cursor-pointer ${className ?? ""}`} title="Recherche par photo" aria-label="Recherche par photo">
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
    </label>
  );
}

/** Products that match the meaning of the query, shown under the normal results. */
export function SemanticResults({ query, excludeIds }: { query: string; excludeIds: string[] }) {
  const { flag } = usePrefs();
  const [items, setItems] = useState<TileProduct[]>([]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || !flag("semantic_search")) { setItems([]); return; }
    const t = window.setTimeout(async () => {
      const { data } = await supabase.functions.invoke("semantic-search", { body: { q, limit: 12 } });
      setItems(((data?.results ?? []) as TileProduct[]).filter((p) => !excludeIds.includes(p.id)));
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, excludeIds.join(",")]);
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-label="Produits proches">
      <h2 className="text-xl font-display font-bold mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Ça pourrait aussi vous intéresser</h2>
      <p className="text-sm text-muted-foreground mb-4">Produits proches du sens de « {query} », même avec d'autres mots.</p>
      <TileGrid products={items} />
    </section>
  );
}
