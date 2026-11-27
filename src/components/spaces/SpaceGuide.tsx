// Guide of a space: progress from real data, next steps, how it works, safety rules, FAQ.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ShieldCheck, Lightbulb, ArrowRight, HelpCircle, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GUIDES, type SpaceKey, type GuideStep } from "./guides";
import { Section, useRpc } from "./kit";

export function useSpaceProgress(space: SpaceKey) {
  const { data, loading, reload } = useRpc<Record<string, boolean>>("get_space_progress", { p_space: space });
  const steps = GUIDES[space].steps;
  const done = steps.filter((s) => data?.[s.key]).length;
  return { flags: data ?? {}, loading, reload, done, total: steps.length, pct: Math.round((done / steps.length) * 100) };
}

function StepRow({ step, ok, onTab }: { step: GuideStep; ok: boolean; onTab: (tab: string) => void }) {
  return (
    <li className={`flex items-start gap-3 rounded-xl border p-3 ${ok ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-foreground/10"}`}>
      {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-label="Fait" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" aria-label="À faire" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${ok ? "text-muted-foreground line-through decoration-emerald-500/40" : ""}`}>{step.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{step.why}</p>
      </div>
      {!ok && (step.action.tab
        ? <Button size="sm" variant="outline" onClick={() => onTab(step.action.tab!)}>{step.action.label}</Button>
        : <Button size="sm" variant="outline" asChild><Link to={step.action.href!}>{step.action.label}</Link></Button>)}
    </li>
  );
}

/** Compact card for the overview: shows the next steps until everything is done. */
const HIDE_KEY = (space: string) => `miyashi_guide_hidden_${space}`;
const guideHidden = (space: string) => { try { return Number(localStorage.getItem(HIDE_KEY(space)) || 0) > Date.now(); } catch { return false; } };

export function GuideProgressCard({ space, onTab }: { space: SpaceKey; onTab: (tab: string) => void }) {
  const { flags, loading, done, total, pct } = useSpaceProgress(space);
  const [hidden, setHidden] = useState(() => guideHidden(space));
  // "Plus tard": hidden for 7 days; the guide stays available from the menu.
  const hide = () => { try { localStorage.setItem(HIDE_KEY(space), String(Date.now() + 7 * 86400000)); } catch { /* private mode */ } setHidden(true); };
  if (hidden) return null;
  if (loading) return <Skeleton className="h-28 rounded-2xl" />;
  if (done === total) return null;
  const next = GUIDES[space].steps.filter((s) => !flags[s.key]).slice(0, 2);
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-transparent p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-semibold text-sm">Bien démarrer · {done}/{total} étapes</p>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onTab("guide")}>Voir le guide <ArrowRight className="w-4 h-4 ml-1" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={hide} aria-label="Masquer le guide pour l'instant" title="Plus tard"><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <Progress value={pct} className="h-2" aria-label={`Progression ${pct} %`} />
      <ul className="mt-3 space-y-2">{next.map((s) => <StepRow key={s.key} step={s} ok={false} onTab={onTab} />)}</ul>
    </div>
  );
}

export default function SpaceGuide({ space, onTab }: { space: SpaceKey; onTab: (tab: string) => void }) {
  const g = GUIDES[space];
  const { flags, loading, done, total, pct } = useSpaceProgress(space);
  return (
    <div className="space-y-4">
      <Section title="Votre guide" description={g.intro}
        action={<Button size="sm" variant="ghost" onClick={() => onTab("vue")} aria-label="Fermer le guide"><X className="w-4 h-4 mr-1" />Fermer</Button>}>
        {loading ? <Skeleton className="h-40 rounded-xl" /> : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 shrink-0" role="img" aria-label={`${pct} % terminé`}>
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary transition-all" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
              </div>
              <div>
                <p className="font-semibold">{done === total ? "Tout est prêt, bravo !" : `${total - done} étape(s) pour bien démarrer`}</p>
                <p className="text-sm text-muted-foreground">Les étapes se cochent toutes seules quand c'est fait.</p>
              </div>
            </div>
            <ul className="space-y-2">{g.steps.map((s) => <StepRow key={s.key} step={s} ok={!!flags[s.key]} onTab={onTab} />)}</ul>
          </>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-3">
        {g.how.map((h) => (
          <div key={h.title} className="rounded-2xl border border-foreground/[0.07] bg-card/80 p-4">
            <p className="font-semibold flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-primary" />{h.title}</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">{h.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
        <p className="font-semibold flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-emerald-400" />Pour votre sécurité</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">{g.safety.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>

      <Section title={<span className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Questions fréquentes</span>}
        action={<Button size="sm" variant="outline" asChild><Link to="/help">Centre d'aide</Link></Button>}>
        <Accordion type="single" collapsible>
          {g.faq.map((f, i) => (
            <AccordionItem key={f.q} value={`f${i}`}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </div>
  );
}
