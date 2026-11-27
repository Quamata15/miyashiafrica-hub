// Recruiter overview: funnel, what to review, interviews.
import { Briefcase, Users, Eye, Inbox, CalendarClock, Bot, Award, Timer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideProgressCard } from "../SpaceGuide";
import { STAGES, Section, Stat, StatGrid, useRpc } from "../kit";

type Stats = { jobs_total: number; jobs_active: number; views: number; applications: number; new_7d: number; to_review: number; by_stage: Record<string, number>; avg_score: number | null;
  hired: number; days_to_hire: number | null; interviews_upcoming: number; interviews_to_review: number };

export default function RecruiterHome({ onTab }: { onTab: (tab: string, extra?: Record<string, string>) => void }) {
  const { data: s, loading } = useRpc<Stats>("get_recruiting_stats");
  const funnel = STAGES.filter((x) => !["rejected", "withdrawn"].includes(x.key));
  const max = Math.max(1, ...funnel.map((f) => s?.by_stage?.[f.key] ?? 0));
  return (
    <div className="space-y-6">
      <GuideProgressCard space="recruteur" onTab={onTab} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onTab("offres", { nouvelle: "1" })}><Plus className="w-4 h-4 mr-1" />Publier une offre</Button>
        <Button variant="outline" onClick={() => onTab("pipeline")}><Users className="w-4 h-4 mr-1" />Trier les candidatures</Button>
        <Button variant="outline" onClick={() => onTab("vivier")}>Chercher des talents</Button>
      </div>
      <StatGrid loading={loading}>
        <Stat label="À examiner" value={s?.to_review ?? 0} hint={`${s?.new_7d ?? 0} reçues en 7 jours`} icon={Inbox} tone={s?.to_review ? "warning" : "muted"} onClick={() => onTab("pipeline")} />
        <Stat label="Offres en ligne" value={`${s?.jobs_active ?? 0}/${s?.jobs_total ?? 0}`} hint={`${s?.views ?? 0} vues`} icon={Briefcase} onClick={() => onTab("offres")} />
        <Stat label="Entretiens à venir" value={s?.interviews_upcoming ?? 0} icon={CalendarClock} tone="accent" onClick={() => onTab("entretiens")} />
        <Stat label="Entretiens à évaluer" value={s?.interviews_to_review ?? 0} icon={Bot} tone={s?.interviews_to_review ? "warning" : "muted"} onClick={() => onTab("entretiens")} />
        <Stat label="Candidatures" value={s?.applications ?? 0} icon={Users} tone="muted" />
        <Stat label="Score moyen" value={s?.avg_score != null ? `${s.avg_score}/100` : "—"} icon={Eye} tone="muted" />
        <Stat label="Recrutés" value={s?.hired ?? 0} icon={Award} tone="accent" />
        <Stat label="Délai moyen" value={s?.days_to_hire != null ? `${s.days_to_hire} j` : "—"} hint="De la candidature au recrutement" icon={Timer} tone="muted" />
      </StatGrid>
      <Section title="Entonnoir de recrutement" description="Toutes offres confondues.">
        <div className="space-y-2">
          {funnel.map((f) => {
            const n = s?.by_stage?.[f.key] ?? 0;
            return (
              <button key={f.key} onClick={() => onTab("pipeline")} className="w-full flex items-center gap-3 text-sm text-left">
                <span className="w-28 shrink-0 text-muted-foreground">{f.label}</span>
                <span className="flex-1 h-6 rounded-md bg-muted overflow-hidden"><span className="block h-full bg-primary/70 rounded-md transition-all" style={{ width: `${(n / max) * 100}%` }} /></span>
                <span className="w-10 text-right tabular-nums font-medium">{n}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
