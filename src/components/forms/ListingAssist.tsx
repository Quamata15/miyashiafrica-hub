// AI listing writer from photos (#39) and price suggestion from comparable listings (#40).
import { useState } from "react";
import { aiAssist, AiNotConfigured } from "@/lib/ai";
import { usePrefs, fcfa } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";

type Draft = { title: string; description: string; category_slug: string | null; tags: string[]; condition: string };

export function AiListingButton({ images, hint, onDraft }: { images: string[]; hint: string; onDraft: (d: Draft) => void }) {
  const { flag } = usePrefs();
  const [busy, setBusy] = useState(false);
  if (!flag("ai_listing")) return null;
  const photos = images.filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) || u.includes("/image/"));
  const run = async () => {
    if (!photos.length) return toast.error("Ajoutez d'abord une photo");
    setBusy(true);
    try {
      const d = await aiAssist<Draft>("describe_product", { images: photos.slice(0, 4), hint });
      onDraft(d);
      toast.success("Annonce rédigée : relisez et corrigez si besoin");
    } catch (e) {
      toast.error(e instanceof AiNotConfigured ? "La rédaction automatique n'est pas encore activée" : (e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-primary" />}Rédiger l'annonce depuis les photos
    </Button>
  );
}

export function PriceSuggestion({ title, categoryId, onPick }: { title: string; categoryId?: string; onPick: (p: number) => void }) {
  const [res, setRes] = useState<{ enough_data: boolean; low?: number; median?: number; high?: number; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (title.trim().length < 3) return toast.error("Écrivez d'abord le titre");
    setBusy(true);
    try { setRes(await aiAssist("suggest_price", { title, category_id: categoryId || undefined })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-1">
      <button type="button" onClick={run} disabled={busy} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}Prix conseillé selon le marché
      </button>
      {res && (res.enough_data ? (
        <p className="text-xs text-muted-foreground">
          {res.message} Fourchette : {fcfa(res.low)} – {fcfa(res.high)}.{" "}
          <button type="button" className="text-primary underline" onClick={() => onPick(res.median!)}>Utiliser {fcfa(res.median)}</button>
        </p>
      ) : <p className="text-xs text-muted-foreground">{res.message}</p>)}
    </div>
  );
}
