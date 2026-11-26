// Admin-managed banners and announcement (#47).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Banner = { id: string; title: string; subtitle: string | null; image_url: string | null; cta_label: string | null; cta_href: string | null };

const Cta = ({ href, children }: { href: string; children: React.ReactNode }) =>
  href.startsWith("/") ? <Link to={href}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function SiteBanners({ placement }: { placement: "home_top" | "home_middle" | "marketplace_top" }) {
  const [list, setList] = useState<Banner[]>([]);
  useEffect(() => {
    supabase.from("site_banners").select("id, title, subtitle, image_url, cta_label, cta_href").eq("placement", placement).eq("is_active", true).order("sort_order").limit(3)
      .then(({ data }) => setList(data ?? []));
  }, [placement]);
  if (!list.length) return null;
  return (
    <section className="container mx-auto px-4 my-8 grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]" aria-label="Promotions">
      {list.map((b) => (
        <div key={b.id} className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card min-h-[160px] flex items-end">
          {b.image_url && <img src={b.image_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="relative p-5 text-white">
            <p className="font-display text-xl font-bold">{b.title}</p>
            {b.subtitle && <p className="text-sm text-white/80 mt-1">{b.subtitle}</p>}
            {b.cta_label && b.cta_href && <Cta href={b.cta_href}><Button size="sm" className="mt-3">{b.cta_label}</Button></Cta>}
          </div>
        </div>
      ))}
    </section>
  );
}

export function AnnouncementBar() {
  const [a, setA] = useState<{ enabled: boolean; text: string; href: string } | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "announcement").maybeSingle().then(({ data }) => setA((data?.value as any) ?? null));
  }, []);
  if (!a?.enabled || !a.text || closed) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[55] bg-primary text-primary-foreground text-sm text-center px-10 py-1.5">
      {a.href ? <Cta href={a.href}><span className="underline underline-offset-2">{a.text}</span></Cta> : a.text}
      <button onClick={() => setClosed(true)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Fermer l'annonce"><X className="w-4 h-4" /></button>
    </div>
  );
}
