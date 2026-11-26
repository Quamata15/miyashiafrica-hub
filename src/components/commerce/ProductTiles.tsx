// Compact product tiles for recommendations (#17), recently viewed, shops and search results.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { recentlyViewed } from "@/lib/local-lists";
import { useAuth } from "@/hooks/useAuth";

export type TileProduct = { id: string; title: string; price: number; images: string[] | null; location: string | null };

export function ProductTile({ p }: { p: TileProduct }) {
  const { money } = usePrefs();
  const img = p.images?.[0];
  return (
    <Link to={`/product/${p.id}`} className="group block rounded-2xl overflow-hidden border border-foreground/[0.08] bg-card/70 hover:border-primary/40 transition-colors">
      <div className="aspect-square bg-muted overflow-hidden">
        {img ? <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground" /></div>}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.title}</p>
        <p className="text-primary font-bold mt-1">{money(p.price, { withEquivalent: false })}</p>
        {p.location && <p className="text-xs text-muted-foreground truncate">{p.location}</p>}
      </div>
    </Link>
  );
}

export function TileGrid({ products }: { products: TileProduct[] }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{products.map((p) => <ProductTile key={p.id} p={p} />)}</div>;
}

export function Recommendations({ title = "Recommandé pour vous", exclude, limit = 12 }: { title?: string; exclude?: string; limit?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<TileProduct[]>([]);
  useEffect(() => {
    supabase.rpc("get_recommendations", { p_limit: limit, p_exclude: exclude }).then(({ data }) => setItems((data as TileProduct[]) ?? []));
  }, [exclude, limit, user?.id]);
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="text-2xl font-display font-bold mb-4">{title}</h2>
      <TileGrid products={items} />
    </section>
  );
}

export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const [items, setItems] = useState<TileProduct[]>([]);
  useEffect(() => {
    const ids = recentlyViewed.list().filter((id) => id !== exclude).slice(0, 12);
    if (!ids.length) return;
    supabase.from("products").select("id, title, price, images, location").in("id", ids).eq("is_active", true).then(({ data }) => {
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      setItems(ids.map((id) => byId.get(id)).filter(Boolean) as TileProduct[]);
    });
  }, [exclude]);
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-label="Vus récemment">
      <h2 className="text-2xl font-display font-bold mb-4">Vus récemment</h2>
      <TileGrid products={items} />
    </section>
  );
}
