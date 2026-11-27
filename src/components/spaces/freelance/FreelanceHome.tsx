// Freelance space overview: where my applications stand, upcoming interviews, best offers.
import { useNavigate } from "react-router-dom";
import { FileText, CalendarClock, Star, Briefcase, Bot, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideProgressCard } from "../SpaceGuide";
import RecommendedJobs from "./RecommendedJobs";
import { Section, Stat, StatGrid, dateFr, useRpc } from "../kit";

type App = { id: string; stage: string; pending_ai_interview: string | null; next_interview: string | null; job_title: string };
type Iv = { id: string; kind: string; status: string; scheduled_at: string | null; expires_at: string | null; job_title: string };

export default function FreelanceHome({ onTab }: { onTab: (tab: string) => void }) {
  const navigate = useNavigate();
  const { data: apps, loading } = useRpc<App[]>("my_applications");
  const { data: ivs } = useRpc<Iv[]>("my_interviews");
  const active = (apps ?? []).filter((a) => !["rejected", "withdrawn", "hired"].includes(a.stage));
  const upcoming = (ivs ?? []).filter((i) => ["scheduled", "in_progress"].includes(i.status));
  return (
    <div className="space-y-6">
      <GuideProgressCard space="freelance" onTab={onTab} />
      <StatGrid loading={loading}>
        <Stat label="Candidatures en cours" value={active.length} icon={FileText} onClick={() => onTab("candidatures")} />
        <Stat label="Présélections" value={(apps ?? []).filter((a) => ["shortlisted", "interview", "offer"].includes(a.stage)).length} icon={Star} tone="accent" />
        <Stat label="Entretiens à venir" value={upcoming.length} icon={CalendarClock} tone="warning" onClick={() => onTab("entretiens")} />
        <Stat label="Recrutements" value={(apps ?? []).filter((a) => a.stage === "hired").length} icon={Briefcase} tone="primary" />
      </StatGrid>
      {upcoming.length > 0 && (
        <Section title="À faire">
          <ul className="space-y-2">
            {upcoming.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-foreground/10 p-3">
                {i.kind === "live" ? <Video className="w-5 h-5 text-sky-400" /> : <Bot className="w-5 h-5 text-violet-400" />}
                <p className="flex-1 text-sm"><span className="font-medium">{i.job_title}</span> · {i.kind === "live" ? `entretien vidéo le ${dateFr(i.scheduled_at, true)}` : `entretien enregistré à passer avant le ${dateFr(i.expires_at, true)}`}</p>
                <Button size="sm" onClick={() => (i.kind === "ai" ? navigate(`/entretien-ia/${i.id}`) : onTab("entretiens"))}>{i.kind === "ai" ? "Commencer" : "Voir"}</Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Les offres qui vous correspondent le mieux" action={<Button size="sm" variant="ghost" onClick={() => onTab("offres")}>Toutes les offres</Button>}>
        <RecommendedJobs limit={10} compact />
      </Section>
    </div>
  );
}
