import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioGrid } from "@/components/commerce/Services";
import { useAuth as usePortfolioAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle, Calendar, Star, Package, Briefcase,
  MessageSquare, Loader2, UserX, Share2, Copy, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import FollowButton from "@/components/follow/FollowButton";
import { toast } from "sonner";

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    const { data: profileData } = await supabase
      .from("profiles_public")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(profileData);

    const [prodRes, servRes, revRes, followRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, title, price, images, created_at")
        .eq("seller_id", userId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("services")
        .select("id, title, price, price_type, images, delivery_days, created_at")
        .eq("provider_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewed_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("followed_id", userId),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (servRes.data) setServices(servRes.data);
    if (revRes.data) setReviews(revRes.data);
    setFollowersCount(followRes.count || 0);

    const rolesArr: string[] = [];
    if (prodRes.data && prodRes.data.length > 0) rolesArr.push("Vendeur");
    if (servRes.data && servRes.data.length > 0) rolesArr.push("Prestataire");
    setRoles(rolesArr);

    setLoading(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const profileUrl = `${window.location.origin}/user/${userId}`;

  const handleShare = async (method: string) => {
    const text = `Découvrez le profil de ${profile?.full_name || "cet utilisateur"} sur MIYASHI`;
    switch (method) {
      case "copy":
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Lien copié !");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + profileUrl)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`, "_blank");
        break;
      case "native":
        if (navigator.share) {
          navigator.share({ title: text, url: profileUrl }).catch(() => {});
        }
        break;
    }
  };

  const handleContact = () => {
    if (!currentUser) {
      toast.error("Connectez-vous pour envoyer un message");
      return;
    }
    navigate(`/messages?to=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center pt-20 gap-4">
          <UserX className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-bold">Profil introuvable</h2>
          <p className="text-muted-foreground">Cet utilisateur n'existe pas ou a été supprimé.</p>
          <Button asChild variant="outline">
            <Link to="/marketplace">Retour au marketplace</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead
        title={`${profile?.username || profile?.full_name || "Utilisateur"} — MIYASHI`}
        description={`Profil de ${profile?.username || profile?.full_name || "utilisateur"} sur MIYASHI. ${profile?.bio || ""}`}
        canonical={`/user/${userId}`}
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-card p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar className="h-20 w-20 border-3 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-hero text-primary-foreground text-2xl font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-xl font-display font-bold">{profile?.username || profile?.full_name || "Utilisateur"}</h1>
                  {profile?.is_verified && (
                    <Badge className="bg-accent text-accent-foreground text-xs">
                      <CheckCircle className="h-3 w-3 mr-0.5" /> Vérifié
                    </Badge>
                  )}
                </div>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground mb-2 max-w-md">{profile.bio}</p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
                  {roles.map((r) => (
                    <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                  ))}
                  {profile?.location && (
                    <span className="flex items-center gap-1">
                      📍 {profile.location}
                    </span>
                  )}
                  {profile?.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Membre depuis {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                    </span>
                  )}
                </div>
                {/* Stats row */}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                  <div className="text-center">
                    <p className="font-bold">{products.length}</p>
                    <p className="text-[10px] text-muted-foreground">Produits</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{services.length}</p>
                    <p className="text-[10px] text-muted-foreground">Services</p>
                  </div>
                  <Link to={`/user/${userId}/follows`} className="text-center hover:opacity-80 transition-opacity">
                    <p className="font-bold">{followersCount}</p>
                    <p className="text-[10px] text-muted-foreground">Abonnés</p>
                  </Link>
                  <div className="text-center">
                    <p className="font-bold">{reviews.length}</p>
                    <p className="text-[10px] text-muted-foreground">Avis</p>
                  </div>
                  {avgRating && (
                    <div className="text-center flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                      <p className="font-bold">{avgRating}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!isOwnProfile && currentUser && (
                  <>
                    <FollowButton userId={userId!} showCount />
                    <Button variant="outline" size="sm" onClick={handleContact}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Contacter
                    </Button>
                  </>
                )}
                {!isOwnProfile && !currentUser && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/auth">
                      <MessageSquare className="h-4 w-4 mr-1" /> Se connecter
                    </Link>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4 mr-1" /> Partager
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare("copy")}>
                      <Copy className="h-4 w-4 mr-2" /> Copier le lien
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
                      <ExternalLink className="h-4 w-4 mr-2" /> WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare("facebook")}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare("twitter")}>
                      <ExternalLink className="h-4 w-4 mr-2" /> X (Twitter)
                    </DropdownMenuItem>
                    {typeof navigator.share === "function" && (
                      <DropdownMenuItem onClick={() => handleShare("native")}>
                        <Share2 className="h-4 w-4 mr-2" /> Partage natif
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {userId && <div className="mb-8"><PortfolioGridOwner userId={userId} /></div>}
            <Tabs defaultValue={products.length > 0 ? "products" : services.length > 0 ? "services" : "reviews"}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="products">
                  <Package className="h-4 w-4 mr-1.5" />
                  Produits ({products.length})
                </TabsTrigger>
                <TabsTrigger value="services">
                  <Briefcase className="h-4 w-4 mr-1.5" />
                  Services ({services.length})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  <Star className="h-4 w-4 mr-1.5" />
                  Avis ({reviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                {products.length === 0 ? (
                  <EmptyState icon={Package} text="Aucun produit en vente" />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map((p) => (
                      <Link key={p.id} to={`/product/${p.id}`}>
                        <Card className="border-0 shadow-soft hover:shadow-card transition-shadow overflow-hidden group">
                          <div className="aspect-square bg-muted overflow-hidden">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="font-medium text-sm truncate">{p.title}</p>
                            <p className="text-primary font-bold text-sm">{Number(p.price).toLocaleString()}F</p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services">
                {services.length === 0 ? (
                  <EmptyState icon={Briefcase} text="Aucun service proposé" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((s) => (
                      <Link key={s.id} to={`/service/${s.id}`}>
                        <Card className="border-0 shadow-soft hover:shadow-card transition-shadow overflow-hidden group">
                          <div className="flex gap-3 p-4">
                            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                              {s.images?.[0] ? (
                                <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{s.title}</p>
                              <p className="text-primary font-bold text-sm">
                                {s.price ? `${Number(s.price).toLocaleString()}F` : "Sur devis"}
                                {s.price_type === "hourly" && "/h"}
                              </p>
                              {s.delivery_days && (
                                <p className="text-xs text-muted-foreground">{s.delivery_days} jours</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews">
                {reviews.length === 0 ? (
                  <EmptyState icon={Star} text="Aucun avis pour le moment" />
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <Card key={r.id} className="border-0 shadow-soft">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < r.rating ? "text-primary fill-primary" : "text-muted"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                          {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <Icon className="w-10 h-10 mb-3 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);

export default PublicProfile;

function PortfolioGridOwner({ userId }: { userId: string }) {
  const { user } = usePortfolioAuth();
  return <PortfolioGrid userId={userId} editable={user?.id === userId} />;
}
