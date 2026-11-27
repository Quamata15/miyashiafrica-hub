// Jobs ranked by how well they match the candidate's profile, with the reasons.
import { useMemo, useState } from "react";
import { Briefcase, Bookmark, BookmarkCheck, MapPin, Clock, CheckCircle2, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApplyDialog from "./ApplyDialog";
import { CONTRACTS, PERIODS, REMOTE, Empty, ScoreBadge, Section, dateFr, fcfa, useRpc } from "../kit";

export type RecoJob = { id: string; title: string; company: string | null; location: string | null; remote_mode: string; contract_type: string; budget_min: number | null; budget_max: number | null; pay_period: string;
  skills_required: string[] | null; deadline: string | null; created_at: string; score: number; applied: boolean; saved: boolean;
  breakdown: { skills?: { matched: string[]; missing: string[] }; experience?: { required: number; have: number }; languages?: { points: number; max: number }; location?: { points: number } } };

export function MatchDetails({ b, score }: { b: RecoJob["breakdown"]; score: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild><button aria-label="Détail de la correspondance"><ScoreBadge score={score} /></button></PopoverTrigger>
      <PopoverContent className="w-72 text-sm space-y-2">
        <p className="font-semibold">Pourquoi {score}/100 ?</p>
        {!!b.skills?.matched.length && <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Vous avez : {b.skills.matched.join(", ")}</p>}
        {!!b.skills?.missing.length && <p className="flex gap-2"><XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />Il manque : {b.skills.missing.join(", ")}</p>}
        {b.experience && b.experience.required > 0 && <p className="flex gap-2">{b.experience.have >= b.experience.required ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}Expérience : {b.experience.have} an(s) pour {b.experience.required} demandé(s)</p>}
        {b.languages && b.languages.points < b.languages.max && <p className="flex gap-2"><XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />Langues demandées incomplètes</p>}
        <p className="text-xs text-muted-foreground">Complétez votre profil (compétences, langues, CV) pour améliorer ce score.</p>
      </PopoverContent>
    </Popover>
  );
}

export default function RecommendedJobs({ limit = 50, compact = false }: { limit?: number; compact?: boolean }) {
  const { user } = useAuth();
  const { data, loading, reload, setData } = useRpc<RecoJob[]>("recommended_jobs", { p_limit: limit });
  const [q, setQ] = useState("");
  const [contract, setContract] = useState("all");
  const [remote, setRemote] = useState("all");
  const [applyTo, setApplyTo] = useState<string | null>(null);

  const list = useMemo(() => (data ?? []).filter((j) =>
    (contract === "all" || j.contract_type === contract) && (remote === "all" || j.remote_mode === remote) &&
    (!q || `${j.title} ${j.company ?? ""} ${(j.skills_required ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [data, q, contract, remote]);

  const toggleSave = async (j: RecoJob) => {
    if (!user) return;
    setData((data ?? []).map((x) => (x.id === j.id ? { ...x, saved: !x.saved } : x)));
    if (j.saved) await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", j.id);
    else await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: j.id });
  };

  const body = loading ? <p className="text-sm text-muted-foreground">Recherche des offres qui vous correspondent…</p> : list.length === 0 ? (
    <Empty icon={Briefcase} title="Aucune offre pour l'instant" text="Revenez bientôt : de nouvelles offres sont publiées chaque jour. Complétez votre profil pour de meilleures suggestions." />
  ) : (
    <ul className="space-y-3">
      {list.slice(0, compact ? 3 : undefined).map((j) => (
        <li key={j.id} className="rounded-xl border border-foreground/10 p-4 hover:border-primary/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{j.title}</p>
              <p className="text-sm text-muted-foreground">{j.company ?? "Entreprise"}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{CONTRACTS[j.contract_type] ?? j.contract_type}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{REMOTE[j.remote_mode]}{j.location ? ` · ${j.location}` : ""}</span>
                {(j.budget_min || j.budget_max) && <span>{j.budget_min ? fcfa(j.budget_min) : ""}{j.budget_max ? ` – ${fcfa(j.budget_max)}` : ""} / {PERIODS[j.pay_period] ?? "mission"}</span>}
                {j.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />avant le {dateFr(j.deadline)}</span>}
              </div>
              {!compact && !!j.skills_required?.length && <div className="mt-2 flex flex-wrap gap-1">{j.skills_required.slice(0, 8).map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <MatchDetails b={j.breakdown} score={j.score} />
              <Button size="icon" variant="ghost" aria-label={j.saved ? "Retirer des offres sauvegardées" : "Sauvegarder l'offre"} onClick={() => toggleSave(j)}>
                {j.saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-3">{j.applied ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Candidature envoyée</Badge> : <Button size="sm" onClick={() => setApplyTo(j.id)}>Postuler</Button>}</div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {compact ? body : (
        <Section title="Offres pour vous" description="Classées selon votre correspondance : compétences, expérience, langues et lieu. Cliquez sur le score pour voir le détail.">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input aria-label="Rechercher une offre" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Intitulé, compétence, entreprise" /></div>
            <Select value={contract} onValueChange={setContract}><SelectTrigger className="w-40" aria-label="Type de contrat"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous contrats</SelectItem>{Object.entries(CONTRACTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            <Select value={remote} onValueChange={setRemote}><SelectTrigger className="w-36" aria-label="Lieu de travail"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Partout</SelectItem>{Object.entries(REMOTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
          </div>
          {body}
        </Section>
      )}
      <ApplyDialog jobId={applyTo} open={!!applyTo} onOpenChange={(o) => !o && setApplyTo(null)} onApplied={() => reload()} />
    </>
  );
}
