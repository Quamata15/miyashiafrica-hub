import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NewsList, Rankings } from "@/components/news/NewsAndRankings";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Briefcase, Rss, Clock, MapPin, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FeedItem {
  id: string;
  type: "product" | "service";
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  location?: string | null;
  created_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
}

const Feed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const [section, setSection] = useState<"news" | "follows">("news");
  useEffect(() => {
    if (user) fetchFeed(); else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFeed = async () => {
    if (!user) return;
    setLoading(true);

    // Get followed user IDs
    const { data: followsData } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", user.id);

    const followedIds = (followsData || []).map((f) => f.followed_id);

    if (followedIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch products and services in parallel
    const [productsRes, servicesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, title, description, price, images, location, created_at, seller_id")
        .in("seller_id", followedIds)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("services")
        .select("id, title, description, price, images, created_at, provider_id")
        .in("provider_id", followedIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Collect unique owner IDs
    const ownerIds = new Set<string>();
    (productsRes.data || []).forEach((p) => ownerIds.add(p.seller_id));
    (servicesRes.data || []).forEach((s) => ownerIds.add(s.provider_id));

    // Fetch profiles
    const { data: profiles } = ownerIds.size > 0
      ? await supabase
          .from("profiles_public")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", Array.from(ownerIds))
      : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    // Merge into feed items
    const feedItems: FeedItem[] = [
      ...(productsRes.data || []).map((p) => {
        const profile = profileMap.get(p.seller_id);
        return {
          id: p.id,
          type: "product" as const,
          title: p.title,
          description: p.description,
          price: p.price,
          images: p.images,
          location: p.location,
          created_at: p.created_at,
          owner_id: p.seller_id,
          owner_name: profile?.username || profile?.full_name || null,
          owner_avatar: profile?.avatar_url || null,
        };
      }),
      ...(servicesRes.data || []).map((s) => {
        const profile = profileMap.get(s.provider_id);
        return {
          id: s.id,
          type: "service" as const,
          title: s.title,
          description: s.description,
          price: s.price,
          images: s.images,
          created_at: s.created_at,
          owner_id: s.provider_id,
          owner_name: profile?.username || profile?.full_name || null,
          owner_avatar: profile?.avatar_url || null,
        };
      }),
    ];

    // Sort by date
    feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(feedItems);
    setLoading(false);
  };

  const filtered = tab === "all" ? items : items.filter((i) => i.type === tab);

  const FeedCard = ({ item }: { item: FeedItem }) => {
    const img = item.images?.[0];
    const detailUrl = item.type === "product" ? `/product/${item.id}` : `/service/${item.id}`;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-soft overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              {img && (
                <Link to={detailUrl} className="sm:w-48 h-40 sm:h-auto shrink-0">
                  <img src={img} alt={item.title} className="w-full h-full object-cover" />
                </Link>
              )}

              <div className="p-4 flex-1 flex flex-col gap-3">
                {/* Owner row */}
                <div className="flex items-center gap-2">
                  <Link to={`/user/${item.owner_id}`}>
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={item.owner_avatar || ""} />
                      <AvatarFallback className="bg-muted text-xs font-bold">
                        {item.owner_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/user/${item.owner_id}`} className="text-sm font-medium hover:underline truncate block">
                      {item.owner_name || "Utilisateur"}
                    </Link>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.type === "product" ? (
                      <><Package className="h-3 w-3 mr-1" />Produit</>
                    ) : (
                      <><Briefcase className="h-3 w-3 mr-1" />Service</>
                    )}
                  </Badge>
                </div>

                {/* Content */}
                <Link to={detailUrl} className="group">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                  )}
                </Link>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    {item.price != null && (
                      <span className="font-bold text-primary">
                        {item.price.toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                    {item.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{item.location}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={detailUrl}>
                      Voir <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Actus — MIYASHI" description="Actualités de MIYASHI, top 3 de la semaine et du mois, nouveautés de vos abonnements." canonical="/feed" />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10"><Rss className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-display font-bold">Actus</h1>
              <p className="text-sm text-muted-foreground">Les nouvelles de MIYASHI, les meilleurs de la semaine et vos abonnements</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="min-w-0">
              <Tabs value={section} onValueChange={(v) => setSection(v as typeof section)} className="mb-3">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
                  <TabsTrigger value="news">Actualités</TabsTrigger>
                  <TabsTrigger value="follows">Mes abonnements</TabsTrigger>
                </TabsList>
              </Tabs>
              {section === "news" ? <NewsList /> : !user ? (
                <Card className="border-0 shadow-soft"><CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Connectez-vous pour voir les nouveautés des vendeurs et prestataires que vous suivez.</p>
                  <Button asChild><Link to="/auth">Se connecter</Link></Button>
                </CardContent></Card>
              ) : loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : items.length === 0 ? (
                <Card className="border-0 shadow-soft">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Rss className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <h2 className="font-semibold text-lg mb-1">Rien à afficher</h2>
                    <p className="text-sm text-muted-foreground mb-4">Suivez des vendeurs et prestataires pour voir leurs nouveautés ici.</p>
                    <Button asChild><Link to="/marketplace">Explorer le marketplace</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Tabs value={tab} onValueChange={setTab} className="mb-3">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Tout ({items.length})</TabsTrigger>
                      <TabsTrigger value="product"><Package className="h-3.5 w-3.5 mr-1" />Produits ({items.filter(i => i.type === "product").length})</TabsTrigger>
                      <TabsTrigger value="service"><Briefcase className="h-3.5 w-3.5 mr-1" />Services ({items.filter(i => i.type === "service").length})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="space-y-3">
                    {filtered.map((item) => <FeedCard key={`${item.type}-${item.id}`} item={item} />)}
                  </div>
                </>
              )}
            </div>
            <aside className="min-w-0 lg:sticky lg:top-24"><Rankings /></aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feed;
