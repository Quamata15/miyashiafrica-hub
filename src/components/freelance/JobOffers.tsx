// Public job board: active offers with their conditions; applying opens the full form
// (recruiter's questions, CV, message) shared with the freelance space.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Briefcase, MapPin, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApplyDialog from "@/components/spaces/freelance/ApplyDialog";
import { CONTRACTS, PERIODS, REMOTE, dateFr, fcfa } from "@/components/spaces/kit";

type Job = { id: string; title: string; description: string | null; company_name: string | null; contract_type: string; remote_mode: string; location: string | null; pay_period: string;
  budget_min: number | null; budget_max: number | null; skills_required: string[] | null; deadline: string | null; created_at: string; screening_questions: unknown[] };

const JobOffers = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [contract, setContract] = useState("all");
  const [remote, setRemote] = useState("all");
  const [applyTo, setApplyTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("jobs").select("id, title, description, company_name, contract_type, remote_mode, location, pay_period, budget_min, budget_max, skills_required, deadline, created_at, screening_questions")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(200).then(({ data }) => setJobs((data ?? []) as unknown as Job[]));
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("applications").select("job_id").eq("freelance_id", user.id).then(({ data }) => setApplied(new Set((data ?? []).map((a) => a.job_id))));
  }, [user?.id]);

  const list = useMemo(() => (jobs ?? []).filter((j) => (!j.deadline || new Date(j.deadline) > new Date()) &&
    (contract === "all" || j.contract_type === contract) && (remote === "all" || j.remote_mode === remote) &&
    (!q || `${j.title} ${j.description ?? ""} ${j.company_name ?? ""} ${(j.skills_required ?? []).join(" ")} ${j.location ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [jobs, q, contract, remote]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input aria-label="Rechercher une offre" placeholder="Intitulé, compétence, entreprise, ville…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" /></div>
        <Select value={contract} onValueChange={setContract}><SelectTrigger className="w-40" aria-label="Type de contrat"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous contrats</SelectItem>{Object.entries(CONTRACTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={remote} onValueChange={setRemote}><SelectTrigger className="w-36" aria-label="Lieu de travail"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Partout</SelectItem>{Object.entries(REMOTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>
      {user && <p className="mb-4 text-sm text-muted-foreground">Voyez votre correspondance avec chaque offre dans votre <Link to="/dashboard?espace=freelance&onglet=offres" className="text-primary underline">espace Freelance</Link>.</p>}

      {jobs === null ? <p className="text-center py-12 text-muted-foreground">Chargement des offres…</p> : list.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucune offre ne correspond à votre recherche.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((j) => (
            <Card key={j.id} className="border-foreground/[0.07] bg-card/80 hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex flex-col h-full">
                <p className="font-semibold text-lg leading-snug">{j.title}</p>
                {j.company_name && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3.5 h-3.5" />{j.company_name}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{CONTRACTS[j.contract_type] ?? j.contract_type}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{REMOTE[j.remote_mode]}{j.location ? ` · ${j.location}` : ""}</span>
                  {j.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />avant le {dateFr(j.deadline)}</span>}
                </div>
                {(j.budget_min || j.budget_max) && <p className="mt-2 text-sm font-medium">{j.budget_min ? fcfa(j.budget_min) : ""}{j.budget_max ? ` – ${fcfa(j.budget_max)}` : ""} <span className="text-muted-foreground font-normal">par {PERIODS[j.pay_period] ?? "mission"}</span></p>}
                {j.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{j.description}</p>}
                {!!j.skills_required?.length && <div className="mt-3 flex flex-wrap gap-1">{j.skills_required.slice(0, 6).map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Publiée le {dateFr(j.created_at)}{j.screening_questions?.length ? ` · ${j.screening_questions.length} question(s)` : ""}</span>
                  {applied.has(j.id) ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Candidature envoyée</Badge> : <Button size="sm" onClick={() => setApplyTo(j.id)}>Postuler</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ApplyDialog jobId={applyTo} open={!!applyTo} onOpenChange={(o) => !o && setApplyTo(null)} onApplied={() => applyTo && setApplied((s) => new Set(s).add(applyTo))} />
    </div>
  );
};

export default JobOffers;
