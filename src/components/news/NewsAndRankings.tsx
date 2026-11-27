// "Actus": MIYASHI news written by the admin, and the top 3 of the week or month for each profile.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Pin, ArrowRight } from "lucide-react";

type News = { id: string; title: string; body: string; category: string; image_url: string | null; link_url: string | null; is_pinned: boolean; published_at: string };
const CAT: Record<string, string> = { actualite: "Actualité", conseil: "Conseil", nouveaute: "Nouveauté", evenement: "Événement", securite: "Sécurité" };

export function NewsList({ limit = 20, compact = false }: { limit?: number; compact?: boolean }) {
  const [news, setNews] = useState<News[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("news_posts").select("id, title, body, category, image_url, link_url, is_pinned, published_at")
      .order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(limit)
      .then(({ data }) => setNews((data ?? []) as News[]));
  }, [limit]);
  if (!news) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  if (!news.length) return <p className="text-sm text-muted-foreground">Pas encore d'actualités.</p>;
  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
      {news.map((n) => {
        const expanded = open === n.id;
        return (
          <Card key={n.id} className="overflow-hidden border-foreground/[0.08] bg-card/80">
            <div className={compact ? "" : "sm:flex"}>
              {n.image_url && (
                <img src={n.image_url} alt="" loading="lazy" className={compact ? "h-36 w-full object-cover" : "h-40 w-full object-cover sm:h-auto sm:w-48 sm:shrink-0"} />
              )}
              <CardContent className="p-4 sm:p-4 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-normal">{CAT[n.category] ?? n.category}</Badge>
                  {n.is_pinned && <span className="flex items-center gap-1 text-primary"><Pin className="h-3 w-3" />À la une</span>}
                  <span>{new Date(n.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
                </div>
                <h3 className="font-display font-bold leading-snug">{n.title}</h3>
                <p className={`mt-1 text-sm text-muted-foreground whitespace-pre-line ${expanded ? "" : "line-clamp-3"}`}>{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <button type="button" className="font-medium text-primary hover:underline" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : n.id)}>{expanded ? "Réduire" : "Lire la suite"}</button>
                  {n.link_url && n.link_url.startsWith("/") && <Link to={n.link_url} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">Y aller <ArrowRight className="h-3.5 w-3.5" /></Link>}
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

type Rank = { role: string; rank: number; user_id: string; name: string; avatar_url: string | null; label: string };
const ROLES: { key: string; label: string; href: (id: string) => string }[] = [
  { key: "seller", label: "Vendeurs", href: (id) => `/user/${id}` },
  { key: "provider", label: "Prestataires", href: (id) => `/user/${id}` },
  { key: "freelance", label: "Freelances", href: (id) => `/user/${id}` },
  { key: "employer", label: "Recruteurs", href: (id) => `/user/${id}` },
  { key: "driver", label: "Livreurs", href: () => "#" },
];
const MEDAL = ["🥇", "🥈", "🥉"];

export function Rankings() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [rows, setRows] = useState<Rank[] | null>(null);
  useEffect(() => {
    setRows(null);
    supabase.rpc("get_rankings", { p_period: period }).then(({ data }) => setRows((data ?? []) as Rank[]));
  }, [period]);
  return (
    <Card className="border-foreground/[0.08] bg-card/80">
      <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Top 3</CardTitle>
        <div className="flex rounded-lg border border-foreground/10 p-0.5 text-xs" role="tablist" aria-label="Période">
          {(["week", "month"] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{p === "week" ? "Semaine" : "Mois"}</button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows ? <Skeleton className="h-48 rounded-xl" /> : ROLES.map((r) => {
          const top = rows.filter((x) => x.role === r.key);
          return (
            <section key={r.key} aria-label={r.label}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</h3>
              {!top.length ? <p className="text-xs text-muted-foreground">Pas encore de classement {period === "week" ? "cette semaine" : "ce mois-ci"}.</p> : (
                <ol className="space-y-1">
                  {top.map((t) => (
                    <li key={t.user_id}>
                      <Link to={r.href(t.user_id)} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/50">
                        <span className="w-5 text-center" aria-label={`${t.rank}e`}>{MEDAL[t.rank - 1]}</span>
                        <Avatar className="h-7 w-7"><AvatarImage src={t.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback></Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{t.label}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
