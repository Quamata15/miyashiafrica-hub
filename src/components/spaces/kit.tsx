// Small building blocks shared by every space of the dashboard.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export { fcfa } from "@/lib/prefs";

/** Calls a database function and keeps its result; `reload()` calls it again. */
export function useRpc<T>(fn: string, args?: Record<string, unknown>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(args ?? {});
  const alive = useRef(true);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(fn, args ?? {});
    if (!alive.current) return;
    if (error) setError(error.message); else { setError(null); setData(data as T); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, key, enabled]);
  useEffect(() => { alive.current = true; reload(); return () => { alive.current = false; }; }, [reload]);
  return { data, loading, error, reload, setData };
}

/** Runs an action, shows its error as a toast, returns true on success. */
export async function attempt(run: () => PromiseLike<{ error: { message: string } | null }>, success?: string) {
  const { error } = await run();
  if (error) { toast.error(cleanError(error.message)); return false; }
  if (success) toast.success(success);
  return true;
}

export const cleanError = (m: string) => m.replace(/^.*?ERROR:\s*/i, "").replace(/\s*CONTEXT:.*$/s, "");

export function Stat({ label, value, hint, icon: Icon, tone = "primary", onClick }: {
  label: string; value: ReactNode; hint?: ReactNode; icon: React.ElementType; tone?: "primary" | "accent" | "warning" | "danger" | "muted"; onClick?: () => void;
}) {
  const tones = { primary: "bg-primary/10 text-primary", accent: "bg-accent/15 text-accent", warning: "bg-amber-500/15 text-amber-500", danger: "bg-destructive/10 text-destructive", muted: "bg-muted text-muted-foreground" };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={cn("text-left rounded-2xl border border-foreground/[0.07] bg-card/80 p-4 transition-colors", onClick && "hover:border-primary/40")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tones[tone])}><Icon className="w-4 h-4" /></span>
      </div>
      <p className="mt-2 font-display text-xl md:text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

export function StatGrid({ loading, children }: { loading?: boolean; children: ReactNode }) {
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
}

export function Section({ title, description, action, children, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("border-foreground/[0.07] bg-card/80", className)}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base md:text-lg">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
      <p className="font-medium">{title}</p>
      {text && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const STAGES = [
  { key: "new", label: "Nouvelles", candidate: "Reçue", tone: "bg-sky-500/15 text-sky-400" },
  { key: "screening", label: "À examiner", candidate: "En cours d'examen", tone: "bg-indigo-500/15 text-indigo-400" },
  { key: "shortlisted", label: "Présélection", candidate: "Présélectionnée", tone: "bg-violet-500/15 text-violet-400" },
  { key: "interview", label: "Entretien", candidate: "Entretien", tone: "bg-amber-500/15 text-amber-500" },
  { key: "offer", label: "Proposition", candidate: "Proposition", tone: "bg-orange-500/15 text-orange-400" },
  { key: "hired", label: "Recrutés", candidate: "Retenue", tone: "bg-emerald-500/15 text-emerald-400" },
  { key: "rejected", label: "Non retenus", candidate: "Non retenue", tone: "bg-destructive/10 text-destructive" },
  { key: "withdrawn", label: "Retirées", candidate: "Retirée", tone: "bg-muted text-muted-foreground" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];
export const stageOf = (k: string) => STAGES.find((s) => s.key === k) ?? STAGES[0];

export const CONTRACTS: Record<string, string> = { freelance: "Freelance", mission: "Mission", cdi: "CDI", cdd: "CDD", stage: "Stage", temps_partiel: "Temps partiel", apprentissage: "Apprentissage" };
export const REMOTE: Record<string, string> = { onsite: "Sur place", hybrid: "Hybride", remote: "À distance" };
export const PERIODS: Record<string, string> = { mission: "la mission", heure: "l'heure", jour: "le jour", mois: "le mois", an: "l'an" };

export function scoreTone(n: number | null | undefined) {
  const v = n ?? 0;
  return v >= 75 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : v >= 50 ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-muted-foreground bg-muted border-foreground/10";
}

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums", scoreTone(score), className)}>{score ?? "—"}/100</span>;
}

/** Opens (or creates) the conversation with another user. */
export async function openConversation(me: string, other: string, navigate: NavigateFunction) {
  const { data: existing } = await supabase.from("conversations").select("id")
    .or(`and(participant_1.eq.${me},participant_2.eq.${other}),and(participant_1.eq.${other},participant_2.eq.${me})`).maybeSingle();
  if (existing) return navigate(`/messages?conversation=${existing.id}`);
  const { data, error } = await supabase.from("conversations").insert({ participant_1: me, participant_2: other }).select("id").single();
  if (error) return toast.error("Impossible d'ouvrir la conversation");
  navigate(`/messages?conversation=${data.id}`);
}

/** Short-lived link to a private file (CV, interview recording). */
export async function signedUrl(bucket: string, path: string, seconds = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) { toast.error("Fichier indisponible"); return null; }
  return data.signedUrl;
}

export const dateFr = (d: string | Date | null | undefined, withTime = false) =>
  d ? new Date(d).toLocaleString("fr-FR", withTime ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const splitList = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
