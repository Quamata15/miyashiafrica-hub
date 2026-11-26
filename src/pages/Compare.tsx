// Product comparison, up to 4 items (#14).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compareList } from "@/lib/local-lists";
import { usePrefs } from "@/lib/prefs";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { GitCompare, X } from "lucide-react";

type P = { id: string; title: string; price: number; images: string[] | null; location: string | null; stock: number | null; description: string | null; seller_id: string; country: string; min_order_qty: number; category: { name: string } | null };

export default function Compare() {
  const { money } = usePrefs();
  const [items, setItems] = useState<P[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; n: number }>>({});
  const [ids, setIds] = useState(compareList.list());
  useEffect(() => {
    const h = () => setIds(compareList.list());
    window.addEventListener(`miyashi:${compareList.key}`, h);
    return () => window.removeEventListener(`miyashi:${compareList.key}`, h);
  }, []);
  useEffect(() => {
    if (!ids.length) { setItems([]); return; }
    supabase.from("products").select("id, title, price, images, location, stock, description, seller_id, country, min_order_qty, category:categories(name)").in("id", ids)
      .then(({ data }) => setItems(ids.map((id) => (data ?? []).find((p) => p.id === id)).filter(Boolean) as unknown as P[]));
    supabase.from("reviews").select("product_id, rating").in("product_id", ids).then(({ data }) => {
      const r: Record<string, { avg: number; n: number }> = {};
      for (const x of data ?? []) { const c = r[x.product_id!] ?? { avg: 0, n: 0 }; c.avg = (c.avg * c.n + x.rating) / (c.n + 1); c.n++; r[x.product_id!] = c; }
      setRatings(r);
    });
  }, [ids]);

  const rows: [string, (p: P) => React.ReactNode][] = [
    ["Prix", (p) => <span className="font-bold text-primary">{money(p.price)}</span>],
    ["Catégorie", (p) => p.category?.name ?? "—"],
    ["Stock", (p) => (p.stock ?? 0) > 0 ? `${p.stock} disponibles` : "Épuisé"],
    ["Avis", (p) => ratings[p.id] ? `${ratings[p.id].avg.toFixed(1)} / 5 (${ratings[p.id].n})` : "Pas d'avis"],
    ["Lieu", (p) => p.location ?? "—"],
    ["Commande minimum", (p) => `${p.min_order_qty} pièce(s)`],
    ["Description", (p) => <span className="text-muted-foreground line-clamp-6">{p.description ?? "—"}</span>],
  ];

  return (
    <PageShell wide title="Comparateur" description="Comparez jusqu'à 4 produits côte à côte." actions={items.length ? <Button variant="outline" onClick={() => compareList.clear()}>Tout retirer</Button> : undefined}>
      {!items.length ? <EmptyState icon={<GitCompare className="w-6 h-6" />} title="Aucun produit à comparer">Sur une fiche produit, cliquez sur « Comparer ». <Link to="/marketplace" className="text-primary underline">Voir les produits</Link></EmptyState> : (
        <div className="overflow-x-auto rounded-2xl border border-foreground/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className="w-36" />{items.map((p) => (
              <th key={p.id} className="p-3 text-left align-top">
                <div className="relative">
                  <button onClick={() => compareList.toggle(p.id)} className="absolute right-0 top-0 p-1 rounded-full bg-background/80" aria-label={`Retirer ${p.title}`}><X className="w-4 h-4" /></button>
                  <div className="aspect-square rounded-xl bg-muted overflow-hidden mb-2">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
                  <Link to={`/product/${p.id}`} className="font-semibold hover:text-primary line-clamp-2">{p.title}</Link>
                </div>
              </th>))}</tr></thead>
            <tbody>{rows.map(([label, f]) => (
              <tr key={label} className="border-t border-foreground/10"><th scope="row" className="p-3 text-left font-medium text-muted-foreground align-top">{label}</th>{items.map((p) => <td key={p.id} className="p-3 align-top">{f(p)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
