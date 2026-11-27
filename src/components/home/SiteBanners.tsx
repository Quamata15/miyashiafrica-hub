// Admin-managed banners, the announcement bar, and the visuals sellers buy with a boost.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, Megaphone } from "lucide-react";

type Banner = { id: string; title: string; subtitle: string | null; image_url: string | null; cta_label: string | null; cta_href: string | null; starts_at: string | null; ends_at: string | null };
export type Placement = "home_top" | "home_middle" | "marketplace_top" | "services_top" | "freelance_top";

const Cta = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
  href.startsWith("/") ? <Link to={href} className={className}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;

const live = (b: Banner) => (!b.starts_at || new Date(b.starts_at) <= new Date()) && (!b.ends_at || new Date(b.ends_at) > new Date());

export function SiteBanners({ placement }: { placement: Placement }) {
  const [list, setList] = useState<Banner[]>([]);
  useEffect(() => {
    supabase.from("site_banners").select("id, title, subtitle, image_url, cta_label, cta_href, starts_at, ends_at").eq("placement", placement).eq("is_active", true).order("sort_order").limit(6)
      // The admin also reads scheduled banners: only the ones running now are shown.
      .then(({ data }) => setList(((data ?? []) as Banner[]).filter(live).slice(0, 3)));
  }, [placement]);
  if (!list.length) return null;
  return (
    <section className="container mx-auto px-4 my-6 md:my-8" aria-label="Promotions">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] md:overflow-visible">
        {list.map((b) => {
          const body = (
            <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card min-h-[150px] md:min-h-[180px] h-full flex items-end">
              {b.image_url && <img src={b.image_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5" />
              <div className="relative p-4 md:p-5 text-white">
                <p className="font-display text-lg md:text-xl font-bold leading-tight">{b.title}</p>
                {b.subtitle && <p className="text-sm text-white/85 mt-1 line-clamp-2">{b.subtitle}</p>}
                {b.cta_label && b.cta_href && <span className="mt-3 inline-flex"><Button size="sm" asChild><span>{b.cta_label}</span></Button></span>}
              </div>
            </div>
          );
          return (
            <div key={b.id} className="group snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto">
              {b.cta_href ? <Cta href={b.cta_href} className="block h-full">{body}</Cta> : body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type Sponsored = { id: string; boost_type: string; title: string; description: string | null; creative_url: string; creative_type: string; href: string };

/** Visuals bought with a boost (image or short video), labelled "Sponsorisé". */
export function SponsoredStrip({ kind, title = "À la une" }: { kind?: "product" | "service" | "job" | "profile" | "freelance"; title?: string }) {
  const { user } = useAuth();
  const [list, setList] = useState<Sponsored[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    supabase.rpc("get_sponsored", { p_kind: kind ?? null, p_limit: 6 }).then(({ data }) => setList((data ?? []) as Sponsored[]));
  }, [kind]);
  useEffect(() => {
    // Impressions are counted for signed-in viewers (the counter refuses anonymous calls).
    if (!user) return;
    for (const s of list) if (!seen.current.has(s.id)) { seen.current.add(s.id); supabase.rpc("increment_boost_metric", { p_boost_id: s.id, p_metric: "views" }).then(() => undefined); }
  }, [list, user]);
  if (!list.length) return null;
  const click = (id: string) => { if (user) supabase.rpc("increment_boost_metric", { p_boost_id: id, p_metric: "clicks" }).then(() => undefined); };
  return (
    <section className="my-6" aria-label="Annonces sponsorisées">
      <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground"><Megaphone className="w-3.5 h-3.5" />{title}</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none">
        {list.map((s) => (
          <Link key={s.id} to={s.href} onClick={() => click(s.id)} className="group relative snap-start shrink-0 w-64 sm:w-72 aspect-[16/9] overflow-hidden rounded-2xl border border-foreground/10 bg-muted">
            {s.creative_type === "video"
              ? <video src={s.creative_url} muted loop playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" />
              : <img src={s.creative_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">Sponsorisé</span>
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="font-semibold leading-tight line-clamp-1">{s.title}</p>
              {s.description && <p className="text-xs text-white/80 line-clamp-1">{s.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AnnouncementBar() {
  const [a, setA] = useState<{ enabled: boolean; text: string; href: string } | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "announcement").maybeSingle().then(({ data }) => setA((data?.value as { enabled: boolean; text: string; href: string } | null) ?? null));
  }, []);
  if (!a?.enabled || !a.text || closed) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[55] bg-primary text-primary-foreground text-sm text-center px-10 py-1.5">
      {a.href ? <Cta href={a.href}><span className="underline underline-offset-2">{a.text}</span></Cta> : a.text}
      <button onClick={() => setClosed(true)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Fermer l'annonce"><X className="w-4 h-4" /></button>
    </div>
  );
}
