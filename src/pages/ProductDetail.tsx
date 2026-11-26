import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ReviewsList from "@/components/reviews/ReviewsList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Package, MapPin, Star, Heart, Share2, ShoppingCart, 
  Minus, Plus, MessageSquare, Shield, Truck, RotateCcw,
  ChevronLeft, ChevronRight, User, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";
import ReportDialog from "@/components/reports/ReportDialog";
import PlatformProtectionBanner from "@/components/trust/PlatformProtectionBanner";
import {
  VariantPicker, TierTable, MakeOfferDialog, GroupBuyCard, SavingsButton, StockAlertButton, CustomsEstimate,
  ShareButtons, CompareToggle, VacationBanner, ShopLink, unitPrice, type Variant, type Tier,
} from "@/components/commerce/ProductExtras";
import { Recommendations, RecentlyViewed } from "@/components/commerce/ProductTiles";
import { usePrefs, sessionId } from "@/lib/prefs";
import { recentlyViewed } from "@/lib/local-lists";
import { hasAnalyticsConsent } from "@/components/layout/CookieConsent";

type Product = Tables<"products">;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [sellerProfile, setSellerProfile] = useState<{ full_name: string | null; avatar_url: string | null; is_verified: boolean | null } | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [shop, setShop] = useState<{ slug: string; name: string; vacation_mode: boolean; vacation_message: string | null; vacation_until: string | null; accepts_cod: boolean } | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const { money, equivalent, flag } = usePrefs();

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (!error && data) {
      setProduct(data);
      recentlyViewed.add(data.id);
      if (hasAnalyticsConsent()) supabase.rpc("track_product_view", { p_product_id: data.id, p_session: sessionId() });
      const [{ data: profile }, { data: vs }, { data: ts }, { data: sh }, { data: rv }] = await Promise.all([
        supabase.from("profiles_public").select("full_name, avatar_url, is_verified").eq("user_id", data.seller_id).maybeSingle(),
        supabase.from("product_variants").select("id, label, options, price, stock, is_active").eq("product_id", data.id).eq("is_active", true).order("sort_order"),
        supabase.from("product_price_tiers").select("min_qty, unit_price").eq("product_id", data.id),
        supabase.from("shops").select("slug, name, vacation_mode, vacation_message, vacation_until, accepts_cod").eq("owner_id", data.seller_id).maybeSingle(),
        supabase.from("reviews").select("rating").eq("product_id", data.id),
      ]);
      if (profile) setSellerProfile(profile);
      const vlist = (vs ?? []) as Variant[];
      setVariants(vlist);
      setVariant(vlist.find((v) => v.stock > 0) ?? null);
      setTiers((ts ?? []) as Tier[]);
      setShop(sh);
      const ratings = (rv ?? []).map((r) => r.rating);
      setRating({ avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, count: ratings.length });
      setQuantity(Math.max(1, data.min_order_qty ?? 1));
    } else {
      setProduct(null);
    }
    setLoading(false);
  };

  const handleOrder = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour commander",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!product) return;

    if (variants.length && !variant) {
      toast({ title: "Choisissez une variante", variant: "destructive" });
      return;
    }
    navigate(`/checkout?product=${product.id}&qty=${quantity}${variant ? `&variant=${variant.id}` : ""}`);
  };

  const handleContactSeller = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!product) return;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${product.seller_id}),and(participant_1.eq.${product.seller_id},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: product.seller_id,
        })
        .select("id")
        .single();

      if (!error && newConv) {
        navigate(`/messages?conversation=${newConv.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Produit non trouvé</h2>
            <p className="text-muted-foreground mb-4">Ce produit n'existe pas ou a été supprimé</p>
            <Button onClick={() => navigate("/marketplace")}>
              Retour au marketplace
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [null];
  const isOwner = user?.id === product.seller_id;
  const listPrice = variant?.price ?? product.price;
  const minQty = Math.max(1, product.min_order_qty ?? 1);
  const stock = variants.length ? (variant?.stock ?? 0) : (product.stock ?? 0);
  const unit = unitPrice(product.price, variant, tiers, quantity);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead
        title={product.title}
        description={product.description?.slice(0, 155) || `${product.title} sur MIYASHI`}
        canonical={`/product/${product.id}`}
        type="product"
        image={product.images?.[0] || undefined}
        price={product.price}
        currency="XOF"
        availability={product.stock && product.stock > 0 ? "InStock" : "OutOfStock"}
        breadcrumbs={[
          { name: "Accueil", url: "/" },
          { name: "Marketplace", url: "/marketplace" },
          { name: product.title, url: `/product/${product.id}` },
        ]}
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate("/")} className="hover:text-foreground">Accueil</button>
            <span>/</span>
            <button onClick={() => navigate("/marketplace")} className="hover:text-foreground">Marketplace</button>
            <span>/</span>
            <span className="text-foreground">{product.title}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted shadow-card">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    {images[activeImage] ? (
                      <img
                        src={images[activeImage]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-24 w-24 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={() => setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={() => setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Quick Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                    onClick={() => product && toggleFavorite(product.id)}
                  >
                    <Heart className={product && checkIsFavorite(product.id) ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4"} />
                  </Button>

                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImage === idx ? "border-primary" : "border-transparent"
                      }`}
                    >
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Title & Rating */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {stock > 0 && stock <= 5 && <Badge variant="secondary">Plus que {stock} en stock</Badge>}
                  {stock <= 0 && <Badge variant="destructive">Épuisé</Badge>}
                  {shop?.accepts_cod !== false && flag("cash_on_delivery") && <Badge variant="outline">Paiement à la livraison possible</Badge>}
                </div>
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-3">{product.title}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  {rating.count > 0 ? (
                    <div className="flex items-center gap-1" aria-label={`Note ${rating.avg.toFixed(1)} sur 5`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-5 w-5 ${star <= Math.round(rating.avg) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      ))}
                      <span className="text-muted-foreground ml-2">{rating.avg.toFixed(1)} ({rating.count} avis)</span>
                    </div>
                  ) : <span className="text-sm text-muted-foreground">Pas encore d'avis</span>}
                  {product.location && (
                    <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{product.location}</div>
                  )}
                </div>
              </div>

              <VacationBanner shop={shop} />

              {/* Price */}
              <div className="py-4 border-y">
                <span className="text-4xl font-bold text-primary">{money(unit, { withEquivalent: false })}</span>
                {unit < listPrice && <span className="text-lg text-muted-foreground line-through ml-3">{money(listPrice, { withEquivalent: false })}</span>}
                {equivalent(unit) && <span className="block text-sm text-muted-foreground mt-1">{equivalent(unit)}</span>}
                {quantity > 1 && <span className="block text-sm text-muted-foreground mt-1">Total pour {quantity} : {money(unit * quantity)}</span>}
              </div>

              <VariantPicker variants={variants} value={variant} onChange={(v) => { setVariant(v); setQuantity((q) => Math.min(q, Math.max(1, v.stock))); }} />
              <TierTable tiers={tiers} minQty={minQty} />

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{product.description || "Aucune description disponible"}</p>
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-4">
                {stock > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="font-medium">Quantité :</span>
                    <div className="flex items-center border rounded-xl">
                      <Button variant="ghost" size="icon" className="rounded-l-xl" aria-label="Moins" onClick={() => setQuantity(Math.max(minQty, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                      <Input type="number" value={quantity} aria-label="Quantité"
                        onChange={(e) => setQuantity(Math.min(stock, Math.max(minQty, parseInt(e.target.value) || minQty)))} className="w-16 text-center border-0" />
                      <Button variant="ghost" size="icon" className="rounded-r-xl" aria-label="Plus" onClick={() => setQuantity(Math.min(stock, quantity + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-muted-foreground">({stock} disponibles)</span>
                  </div>
                )}

                {isOwner ? (
                  <div className="rounded-xl border border-foreground/10 p-3 text-sm text-muted-foreground">C'est votre produit. Gérez variantes, prix de gros et achats groupés depuis <Link to="/shop/manage" className="text-primary underline">Ma boutique</Link>.</div>
                ) : stock <= 0 ? (
                  <StockAlertButton productId={product.id} variantId={variant?.id} />
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    <Button variant="hero" size="lg" className="flex-1 rounded-xl" onClick={handleOrder}>
                      <ShoppingCart className="w-5 h-5 mr-2" />Commander maintenant
                    </Button>
                    <Button variant="outline" size="lg" className="rounded-xl" onClick={() => {
                      if (variants.length && !variant) return toast({ title: "Choisissez une variante", variant: "destructive" });
                      addToCart(product.id, undefined, quantity, variant?.id ?? null);
                    }}>
                      <ShoppingCart className="w-5 h-5 mr-2" />Ajouter au panier
                    </Button>
                    {flag("offers") && <MakeOfferDialog productId={product.id} listPrice={listPrice} variant={variant} quantity={quantity} />}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  {!isOwner && stock > 0 && flag("savings") && <SavingsButton productId={product.id} variant={variant} quantity={quantity} />}
                  <CompareToggle productId={product.id} />
                  <Button variant="ghost" size="sm" onClick={handleContactSeller}><MessageSquare className="w-4 h-4 mr-1" />Contacter le vendeur</Button>
                </div>
                <ShareButtons title={product.title} url={`${window.location.origin}/product/${product.id}`} />
              </div>

              {flag("group_buys") && <GroupBuyCard productId={product.id} listPrice={listPrice} isSeller={isOwner} />}
              <CustomsEstimate from={product.country || "TG"} amount={unit * quantity} />

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-4">
                {[
                  { icon: Shield, label: "Paiement sécurisé" },
                  { icon: Truck, label: "Livraison suivie" },
                  { icon: RotateCcw, label: "Litige possible" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Seller Card */}
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={sellerProfile?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                        {sellerProfile?.full_name?.charAt(0) || <User className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{sellerProfile?.full_name || "Vendeur"}</h4>
                        {sellerProfile?.is_verified && (
                          <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                            <CheckCircle className="h-3 w-3 mr-0.5" />Vérifié
                          </Badge>
                        )}
                      </div>
                      <ShopLink shop={shop} />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleContactSeller}>
                      Contacter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Protection */}
              <PlatformProtectionBanner />
            </motion.div>
          </div>

          {/* Report */}
          <div className="mt-8 flex justify-end">
            <ReportDialog targetType="product" targetId={product.id} />
          </div>

          {/* Reviews Section */}
          <div className="mt-12 lg:mt-16">
            <h2 className="text-2xl font-display font-bold mb-6">Avis clients</h2>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ReviewsList productId={product.id} sellerId={product.seller_id} />
              </div>
              <div>
                {user && (
                  <ReviewForm productId={product.id} onSuccess={() => {}} />
                )}
              </div>
            </div>
          </div>
          <Recommendations title="Vous aimerez aussi" exclude={product.id} />
          <RecentlyViewed exclude={product.id} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
