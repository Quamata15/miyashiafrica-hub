import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Package, Briefcase, ArrowLeft, ShoppingCart, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading } = useFavorites();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const productFavorites = favorites.filter(f => f.product);
  const serviceFavorites = favorites.filter(f => f.service);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'XOF',
      minimumFractionDigits: 0 
    }).format(price);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-4">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour voir vos favoris
            </p>
            <Button variant="default" onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-28">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            Mes Favoris
          </h1>
          <p className="text-muted-foreground mt-2">
            {favorites.length} article{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}
          </p>
        </motion.div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits ({productFavorites.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Services ({serviceFavorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : productFavorites.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun produit favori</h3>
                <p className="text-muted-foreground mb-4">
                  Explorez le marketplace pour ajouter des produits à vos favoris
                </p>
                <Button onClick={() => navigate('/marketplace')}>
                  Voir les produits
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productFavorites.map((fav, index) => (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300"
                      onClick={() => navigate(`/product/${fav.product?.id}`)}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        {fav.product?.images?.[0] ? (
                          <img
                            src={fav.product.images[0]}
                            alt={fav.product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <FavoriteButton productId={fav.product?.id} />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {fav.product?.title}
                        </h3>
                        <p className="text-primary font-bold text-lg mb-3">
                          {formatPrice(fav.product?.price || 0)}
                        </p>
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(fav.product?.id);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ajouter au panier
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : serviceFavorites.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun service favori</h3>
                <p className="text-muted-foreground mb-4">
                  Explorez les services pour en ajouter à vos favoris
                </p>
                <Button onClick={() => navigate('/services')}>
                  Voir les services
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {serviceFavorites.map((fav, index) => (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300"
                      onClick={() => navigate(`/service/${fav.service?.id}`)}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        {fav.service?.images?.[0] ? (
                          <img
                            src={fav.service.images[0]}
                            alt={fav.service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Briefcase className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <FavoriteButton serviceId={fav.service?.id} />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {fav.service?.title}
                        </h3>
                        {fav.service?.price && (
                          <p className="text-primary font-bold text-lg">
                            {formatPrice(fav.service.price)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
