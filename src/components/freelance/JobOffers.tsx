// Public job board: active offers with their conditions; applying opens the full form
// (recruiter's questions, CV, message) shared with the freelance space.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Briefcase, MapPin, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApplyDialog from "@/components/spaces/freelance/ApplyDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSpaces } from "@/hooks/useSpaces";
import { SpaceLocked } from "@/components/spaces/SpaceAccess";
import { CONTRACTS, PERIODS, REMOTE, dateFr, fcfa } from "@/components/spaces/kit";

type Job = { id: string; employer_id: string; title: string; description: string | null; company_name: string | null; contract_type: string; remote_mode: string; location: string | null; pay_period: string;
  budget_min: number | null; budget_max: number | null; skills_required: string[] | null; deadline: string | null; created_at: string; screening_questions: unknown[];
  experience_min: number | null; education_level: string | null; languages: string[] | null; nice_to_have: string[] | null; openings: number | null; country: string | null;
  ai_interview: boolean | null; is_featured?: boolean | null };

const JobOffers = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [contract, setContract] = useState("all");
  const [remote, setRemote] = useState("all");
  const [applyTo, setApplyTo] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const sp = useSpaces();
  const navigate = useNavigate();
  // Applying belongs to the freelance space. Recruiters (opposite space) never see the button;
  // other accounts are offered to open the freelance space first.
  const canApply = sp.can("apply");
  const mayOpen = !canApply && !!sp.option("freelance")?.available;

  useEffect(() => {
    supabase.from("jobs").select("id, employer_id, title, description, company_name, contract_type, remote_mode, location, pay_period, budget_min, budget_max, skills_required, deadline, created_at, screening_questions, experience_min, education_level, languages, nice_to_have, openings, country, ai_interview, is_featured")
      .eq("is_active", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(200).then(({ data }) => setJobs((data ?? []) as unknown as Job[]));
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
      {user && canApply && <p className="mb-4 text-sm text-muted-foreground">Voyez votre correspondance avec chaque offre dans votre <Link to="/dashboard?espace=freelance&onglet=offres" className="text-primary underline">espace Freelance</Link>.</p>}

      {jobs === null ? <p className="text-center py-12 text-muted-foreground">Chargement des offres…</p> : list.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucune offre ne correspond à votre recherche.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((j) => (
            <Card key={j.id} className="border-foreground/[0.07] bg-card/80 hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-lg leading-snug">{j.title}</p>
                  {j.is_featured && <Badge className="shrink-0 bg-primary/15 text-primary border-0">★ Vedette</Badge>}
                </div>
                {j.company_name && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3.5 h-3.5" />{j.company_name}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{CONTRACTS[j.contract_type] ?? j.contract_type}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{REMOTE[j.remote_mode]}{j.location ? ` · ${j.location}` : ""}</span>
                  {j.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />avant le {dateFr(j.deadline)}</span>}
                </div>
                {(j.budget_min || j.budget_max) && <p className="mt-2 text-sm font-medium">{j.budget_min ? fcfa(j.budget_min) : ""}{j.budget_max ? ` – ${fcfa(j.budget_max)}` : ""} <span className="text-muted-foreground font-normal">par {PERIODS[j.pay_period] ?? "mission"}</span></p>}
                {j.description && <p className={`mt-2 text-sm text-muted-foreground whitespace-pre-line ${open.has(j.id) ? "" : "line-clamp-3"}`}>{j.description}</p>}
                {!!j.skills_required?.length && <div className="mt-3 flex flex-wrap gap-1">{(open.has(j.id) ? j.skills_required : j.skills_required.slice(0, 6)).map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
                {open.has(j.id) && (
                  <dl id={`job-${j.id}`} className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                    {j.experience_min != null && <div><dt className="text-xs text-muted-foreground">Expérience</dt><dd>{j.experience_min ? `${j.experience_min} an(s) minimum` : "Débutant accepté"}</dd></div>}
                    {j.education_level && <div><dt className="text-xs text-muted-foreground">Niveau d'études</dt><dd>{j.education_level}</dd></div>}
                    {!!j.languages?.length && <div><dt className="text-xs text-muted-foreground">Langues</dt><dd>{j.languages.join(", ")}</dd></div>}
                    {!!j.openings && j.openings > 1 && <div><dt className="text-xs text-muted-foreground">Postes</dt><dd>{j.openings}</dd></div>}
                    {j.country && <div><dt className="text-xs text-muted-foreground">Pays</dt><dd>{j.country}</dd></div>}
                    <div><dt className="text-xs text-muted-foreground">Candidature</dt><dd>{j.screening_questions?.length ? `${j.screening_questions.length} question(s)` : "CV et message"}{j.ai_interview ? " · entretien vidéo" : ""}</dd></div>
                    {!!j.nice_to_have?.length && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Un plus</dt><dd>{j.nice_to_have.join(", ")}</dd></div>}
                    <div className="col-span-2 text-xs text-muted-foreground">Toute la suite (échanges, entretien, paiement des missions) se fait sur MIYASHI.</div>
                  </dl>
                )}
                <button type="button" onClick={() => toggle(j.id)} aria-expanded={open.has(j.id)} aria-controls={`job-${j.id}`}
                  className="mt-2 self-start text-sm font-medium text-primary hover:underline">{open.has(j.id) ? "Réduire" : "Voir tous les détails"}</button>
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Publiée le {dateFr(j.created_at)}{j.screening_questions?.length ? ` · ${j.screening_questions.length} question(s)` : ""}</span>
                  {user && j.employer_id === user.id ? <Button asChild size="sm" variant="outline"><Link to={`/dashboard?espace=recruteur&onglet=pipeline&offre=${j.id}`}>Votre offre · candidats</Link></Button>
                    : applied.has(j.id) ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Candidature envoyée</Badge>
                    : !user ? <Button size="sm" onClick={() => navigate("/auth")}>Postuler</Button>
                    : canApply ? <Button size="sm" onClick={() => setApplyTo(j.id)}>Postuler</Button>
                    : mayOpen ? <Button size="sm" variant="outline" onClick={() => setLocked(true)}>Postuler</Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={locked} onOpenChange={setLocked}>
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">Espace Freelance requis</DialogTitle>
          <SpaceLocked feature="apply" title="Pour postuler, ouvrez l'espace Freelance" />
        </DialogContent>
      </Dialog>
      <ApplyDialog jobId={applyTo} open={!!applyTo} onOpenChange={(o) => !o && setApplyTo(null)} onApplied={() => applyTo && setApplied((s) => new Set(s).add(applyTo))} />
    </div>
  );
};

export default JobOffers;
