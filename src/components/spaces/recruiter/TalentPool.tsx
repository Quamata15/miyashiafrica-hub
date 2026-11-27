// Talent pool: search open-to-work profiles, save candidates, contact them.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bookmark, BookmarkCheck, MessageSquare, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Section, cleanError, fcfa, openConversation, splitList } from "../kit";
import { toast } from "sonner";

type Talent = { user_id: string; full_name: string | null; avatar_url: string | null; title: string | null; skills: string[] | null; experience_years: number | null; location: string | null; languages: string[] | null; hourly_rate: number | null; availability: string | null; matched: number; saved: boolean };

function TalentRow({ t, onSave, onMessage }: { t: Talent; onSave: () => void; onMessage: () => void }) {
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <Avatar className="h-11 w-11"><AvatarImage src={t.avatar_url ?? undefined} alt="" /><AvatarFallback>{(t.full_name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-[200px]">
        <p className="font-medium">{t.full_name ?? "Talent"} <span className="text-sm font-normal text-muted-foreground">· {t.title ?? "—"}</span></p>
        <p className="text-xs text-muted-foreground">{[t.location, t.experience_years != null ? `${t.experience_years} an(s)` : null, (t.languages ?? []).join(", "), t.hourly_rate ? `${fcfa(t.hourly_rate)}/h` : null, t.availability].filter(Boolean).join(" · ")}</p>
        {!!t.skills?.length && <div className="mt-1 flex flex-wrap gap-1">{t.skills.slice(0, 8).map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" aria-label={t.saved ? "Retirer du vivier" : "Ajouter au vivier"} onClick={onSave}>{t.saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}</Button>
        <Button size="sm" variant="outline" onClick={onMessage}><MessageSquare className="w-4 h-4 mr-1" />Contacter</Button>
      </div>
    </li>
  );
}

export default function TalentPool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState(""); const [skills, setSkills] = useState(""); const [loc, setLoc] = useState(""); const [exp, setExp] = useState("");
  const [results, setResults] = useState<Talent[] | null>(null);
  const [saved, setSaved] = useState<Talent[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("search_talent", { p_q: q || undefined, p_skills: splitList(skills), p_location: loc || undefined, p_min_exp: Number(exp) || 0, p_limit: 50 });
    setBusy(false);
    if (error) return toast.error(cleanError(error.message));
    setResults((data ?? []) as Talent[]);
  };
  const loadSaved = async () => {
    if (!user) return;
    const { data } = await supabase.from("saved_candidates").select("candidate_id").eq("employer_id", user.id);
    const ids = (data ?? []).map((d) => d.candidate_id);
    if (!ids.length) return setSaved([]);
    const [{ data: ps }, { data: fs }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url, location").in("user_id", ids),
      supabase.from("freelance_profiles_public").select("user_id, title, skills, experience_years, hourly_rate, availability").in("user_id", ids),
    ]);
    setSaved(ids.map((id) => {
      const p = ps?.find((x) => x.user_id === id); const f = fs?.find((x) => x.user_id === id);
      return { user_id: id, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null, location: p?.location ?? null, title: f?.title ?? null, skills: f?.skills ?? null, experience_years: f?.experience_years ?? null, hourly_rate: f?.hourly_rate ?? null, availability: f?.availability ?? null, languages: null, matched: 0, saved: true };
    }));
  };
  useEffect(() => { search(); loadSaved(); }, [user?.id]);

  const toggleSave = async (t: Talent) => {
    if (!user) return;
    if (t.saved) await supabase.from("saved_candidates").delete().eq("employer_id", user.id).eq("candidate_id", t.user_id);
    else await supabase.from("saved_candidates").insert({ employer_id: user.id, candidate_id: t.user_id });
    setResults((r) => r?.map((x) => (x.user_id === t.user_id ? { ...x, saved: !t.saved } : x)) ?? null);
    loadSaved();
  };
  const message = (t: Talent) => user && openConversation(user.id, t.user_id, navigate);

  return (
    <Section title="Vivier de talents" description="Profils ouverts aux opportunités. Contactez-les avec respect : présentez le poste et invitez-les à postuler.">
      <Tabs defaultValue="search">
        <TabsList><TabsTrigger value="search">Rechercher</TabsTrigger><TabsTrigger value="saved">Mon vivier ({saved?.length ?? 0})</TabsTrigger></TabsList>
        <TabsContent value="search" className="pt-3">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_100px_auto]">
            <Input aria-label="Mots-clés" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mots-clés (titre, présentation)" />
            <Input aria-label="Compétences" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Compétences : React, Sage" />
            <Input aria-label="Ville" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ville" />
            <Input aria-label="Expérience minimale" type="number" min={0} value={exp} onChange={(e) => setExp(e.target.value)} placeholder="Exp. min" />
            <Button onClick={search} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}<span className="ml-1">Chercher</span></Button>
          </div>
          {results === null ? null : results.length === 0 ? <Empty icon={Users} title="Aucun profil ne correspond" text="Élargissez la recherche : moins de compétences, ville vide." /> : (
            <ul className="divide-y divide-border mt-2">{results.map((t) => <TalentRow key={t.user_id} t={t} onSave={() => toggleSave(t)} onMessage={() => message(t)} />)}</ul>
          )}
        </TabsContent>
        <TabsContent value="saved" className="pt-3">
          {!saved?.length ? <Empty icon={Bookmark} title="Votre vivier est vide" text="Ajoutez des profils intéressants pour les retrouver plus tard." /> : (
            <ul className="divide-y divide-border">{saved.map((t) => <TalentRow key={t.user_id} t={t} onSave={() => toggleSave(t)} onMessage={() => message(t)} />)}</ul>
          )}
        </TabsContent>
      </Tabs>
    </Section>
  );
}
