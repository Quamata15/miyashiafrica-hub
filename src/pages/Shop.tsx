// Public shop page with its own address: /boutique/<slug> (#18), opening hours (#23), vacation (#24).
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TileGrid, type TileProduct } from "@/components/commerce/ProductTiles";
import { ShareButtons, VacationBanner } from "@/components/commerce/ProductExtras";
import { openState, type Hours } from "@/lib/hours";
import { PHOTOS, photoUrl } from "@/lib/photos";
import { Clock, MapPin, MessageSquare, Search, Store } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Shop() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Tables<"shops"> | null | undefined>(undefined);
  const [products, setProducts] = useState<TileProduct[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("shops").select("*").eq("slug", slug!).maybeSingle().then(async ({ data }) => {
      setShop(data);
      if (data) {
        const { data: p } = await supabase.from("products").select("id, title, price, images, location").eq("seller_id", data.owner_id)
          .eq("is_active", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
        setProducts(p ?? []);
      }
    });
  }, [slug]);

  const contact = async () => {
    if (!user) return navigate("/auth");
    if (!shop) return;
    const { data: existing } = await supabase.from("conversations").select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${shop.owner_id}),and(participant_1.eq.${shop.owner_id},participant_2.eq.${user.id})`).maybeSingle();
    if (existing) return navigate(`/messages?conversation=${existing.id}`);
    const { data } = await supabase.from("conversations").insert({ participant_1: user.id, participant_2: shop.owner_id }).select("id").single();
    if (data) navigate(`/messages?conversation=${data.id}`);
  };

  if (shop === null) return (
    <div className="min-h-screen flex flex-col bg-gradient-warm"><Header /><main className="flex-1 pt-header text-center px-4"><Store className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><h1 className="text-2xl font-bold">Boutique introuvable</h1></main><Footer /></div>
  );
  if (!shop) return <div className="min-h-screen bg-gradient-warm" />;

  const state = openState(shop.opening_hours as Hours);
  const shown = q ? products.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())) : products;
  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title={shop.name} description={shop.description?.slice(0, 155) ?? `Boutique ${shop.name} sur MIYASHI`} canonical={`/boutique/${shop.slug}`} />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="relative h-44 md:h-64 bg-muted overflow-hidden" style={shop.theme_color ? { background: shop.theme_color } : undefined}>
          <img src={shop.banner_url || photoUrl(PHOTOS.baobabTwin, 1600, 500)} alt="" className={`w-full h-full object-cover ${shop.banner_url ? "" : "opacity-60"}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
        <div className="container mx-auto px-4 -mt-16 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="w-28 h-28 rounded-2xl border-4 border-background bg-card overflow-hidden shrink-0 flex items-center justify-center">
              {shop.logo_url ? <img src={shop.logo_url} alt={`Logo ${shop.name}`} className="w-full h-full object-cover" /> : <Store className="w-10 h-10 text-primary" />}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-bold">{shop.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                {shop.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{shop.city}</span>}
                {state && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /><Badge variant={state.open ? "default" : "secondary"}>{state.open ? "Ouvert" : "Fermé"}</Badge> {state.today}</span>}
                {shop.accepts_cod && <Badge variant="outline">Paiement à la livraison</Badge>}
                {shop.store_pickup_address && <Badge variant="outline">Retrait en boutique</Badge>}
              </div>
            </div>
            <div className="flex gap-2"><Button onClick={contact}><MessageSquare className="w-4 h-4 mr-2" />Contacter</Button></div>
          </div>
          <VacationBanner shop={shop} />
          {shop.description && <p className="text-muted-foreground max-w-3xl whitespace-pre-line mt-4">{shop.description}</p>}
          <div className="mt-4"><ShareButtons title={shop.name} url={`${window.location.origin}/boutique/${shop.slug}`} /></div>
          <div className="flex items-center justify-between gap-3 mt-8 mb-4">
            <h2 className="text-xl font-display font-bold">{products.length} produit{products.length > 1 ? "s" : ""}</h2>
            <div className="relative w-64 max-w-[60%]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans la boutique" className="pl-9" /></div>
          </div>
          {shown.length ? <TileGrid products={shown} /> : <p className="text-muted-foreground">Aucun produit pour le moment.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
