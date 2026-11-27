// Admin: choose featured listings and write the news shown in "Actus".
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Star } from "lucide-react";
import CrudTable from "./CrudTable";

type Kind = "product" | "service" | "job" | "freelance";
type Item = { id: string; title: string | null; is_featured: boolean; sub?: string };
const SOURCES: Record<Kind, { table: "products" | "services" | "jobs" | "freelance_profiles"; label: string; cols: string }> = {
  product: { table: "products", label: "Produits", cols: "id, title, is_featured, location" },
  service: { table: "services", label: "Services", cols: "id, title, is_featured, price" },
  job: { table: "jobs", label: "Offres et missions", cols: "id, title, is_featured, contract_type" },
  freelance: { table: "freelance_profiles", label: "Freelances", cols: "id, title, is_featured, location" },
};

function FeaturedList({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const src = SOURCES[kind];
  const load = () => supabase.from(src.table).select(src.cols).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(300)
    .then(({ data }) => setItems(((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      id: String(r.id), title: (r.title as string) ?? "Sans titre", is_featured: !!r.is_featured,
      sub: String(r.location ?? r.contract_type ?? (r.price ? `${Number(r.price).toLocaleString("fr-FR")} F` : "")),
    }))));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind]);
  const toggle = async (it: Item) => {
    const { error } = await supabase.rpc("set_featured", { p_kind: kind, p_id: it.id, p_on: !it.is_featured });
    if (error) return toast.error(errMsg(error));
    setItems((xs) => xs?.map((x) => (x.id === it.id ? { ...x, is_featured: !x.is_featured } : x)) ?? null);
  };
  const shown = (items ?? []).filter((i) => !q || (i.title ?? "").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="max-w-xs" />
      <p className="text-xs text-muted-foreground">{(items ?? []).filter((i) => i.is_featured).length} en vedette. Les vedettes passent en tête sur l'accueil et dans les listes.</p>
      <ul className="divide-y divide-foreground/10 rounded-xl border border-foreground/10">
        {shown.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-3 py-2">
            <button type="button" onClick={() => toggle(it)} aria-pressed={it.is_featured} aria-label={it.is_featured ? "Retirer des vedettes" : "Mettre en vedette"}
              className={`rounded-lg p-1.5 ${it.is_featured ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Star className={`h-5 w-5 ${it.is_featured ? "fill-current" : ""}`} />
            </button>
            <span className="min-w-0 flex-1 truncate text-sm">{it.title}</span>
            {it.sub && <span className="shrink-0 text-xs text-muted-foreground">{it.sub}</span>}
          </li>
        ))}
        {items && !shown.length && <li className="px-3 py-4 text-sm text-muted-foreground">Rien à afficher.</li>}
      </ul>
    </div>
  );
}

export default function AdminFeaturedNews() {
  return (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Vedettes</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="product">
            <TabsList className="flex-wrap h-auto">{(Object.keys(SOURCES) as Kind[]).map((k) => <TabsTrigger key={k} value={k}>{SOURCES[k].label}</TabsTrigger>)}</TabsList>
            {(Object.keys(SOURCES) as Kind[]).map((k) => <TabsContent key={k} value={k} className="mt-3"><FeaturedList kind={k} /></TabsContent>)}
          </Tabs>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Actualités (page Actus)</CardTitle></CardHeader>
        <CardContent>
          <CrudTable table="news_posts" order="published_at" defaults={{ category: "actualite", is_pinned: false }} fields={[
            { key: "title", label: "Titre", required: true },
            { key: "category", label: "Rubrique", type: "select", options: [["actualite", "Actualité"], ["nouveaute", "Nouveauté"], ["conseil", "Conseil"], ["evenement", "Événement"], ["securite", "Sécurité"]] },
            { key: "body", label: "Texte", type: "textarea", required: true, hideInList: true },
            { key: "image_url", label: "Image", type: "image", hideInList: true },
            { key: "link_url", label: "Lien (ex. /marketplace)", hideInList: true },
            { key: "is_pinned", label: "À la une", type: "bool" },
            { key: "published_at", label: "Publiée le", type: "datetime" },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
}
