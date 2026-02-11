import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ChevronLeft, ChevronRight, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setProduct(data);
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

    const totalAmount = product.price * quantity;
    navigate(`/checkout?amount=${totalAmount}&product=${product.id}&seller=${product.seller_id}&qty=${quantity}`);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
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
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={isFavorite ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4"} />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Share2 className="h-4 w-4" />
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
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Nouveau</Badge>
                  {product.stock && product.stock <= 5 && (
                    <Badge variant="secondary">Plus que {product.stock} en stock</Badge>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-3">
                  {product.title}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                    <span className="text-muted-foreground ml-2">(0 avis)</span>
                  </div>
                  {product.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {product.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="py-4 border-y">
                <span className="text-4xl font-bold text-primary">
                  {product.price.toLocaleString()}
                </span>
                <span className="text-xl text-muted-foreground ml-2">FCFA</span>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || "Aucune description disponible"}
                </p>
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Quantité:</span>
                  <div className="flex items-center border rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-l-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-r-xl"
                      onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-muted-foreground">({product.stock} disponibles)</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="flex-1 rounded-xl"
                    onClick={handleOrder}
                    disabled={ordering}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {ordering ? "Commande en cours..." : "Commander maintenant"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 rounded-xl"
                    onClick={handleContactSeller}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Contacter le vendeur
                  </Button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-4">
                {[
                  { icon: Shield, label: "Paiement sécurisé" },
                  { icon: Truck, label: "Livraison rapide" },
                  { icon: RotateCcw, label: "Retour facile" },
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
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">Vendeur</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span>5.0 (0 avis)</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleContactSeller}>
                      Contacter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12 lg:mt-16">
            <h2 className="text-2xl font-display font-bold mb-6">Avis clients</h2>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ReviewsList productId={product.id} />
              </div>
              <div>
                {user && (
                  <ReviewForm productId={product.id} onSuccess={() => {}} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
