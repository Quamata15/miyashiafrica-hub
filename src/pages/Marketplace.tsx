import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, MapPin, Package, SlidersHorizontal, Grid3X3, 
  List, Heart, Eye, ShoppingCart, Star, ArrowUpDown, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import AdvancedSearchFilters, { ActiveFilterPills, type SearchFilters } from "@/components/search/AdvancedSearchFilters";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;

const Marketplace = () => {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [verifiedSellers, setVerifiedSellers] = useState<Set<string>>(new Set());
  const [promotions, setPromotions] = useState<Map<string, { discount_type: string; discount_value: number }>>(new Map());
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: searchParams.get("q") || "",
    selectedCategory: null,
    priceRange: [0, 10000000],
    location: "",
    minRating: 0,
    sortBy: "newest",
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [productRatings, setProductRatings] = useState<Map<string, number>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const updateFilters = (partial: Partial<SearchFilters>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const resetFilters = () =>
    setFilters({ searchTerm: "", selectedCategory: null, priceRange: [0, 10000000], location: "", minRating: 0, sortBy: "newest" });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch active boosts to prioritize boosted products
      const { data: activeBoosts } = await (supabase.from("boosts") as any)
        .select("user_id, boost_type")
        .eq("is_active", true)
        .eq("boost_type", "product")
        .gt("expires_at", new Date().toISOString());

      const boostedSellerIds = new Set(
        (activeBoosts || []).map((b: any) => b.user_id)
      );

      // Sort: boosted products first, then by created_at desc
      const sorted = [...data].sort((a, b) => {
        const aBoost = boostedSellerIds.has(a.seller_id) ? 1 : 0;
        const bBoost = boostedSellerIds.has(b.seller_id) ? 1 : 0;
        if (bBoost !== aBoost) return bBoost - aBoost;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProducts(sorted);

      // Fetch verified status and active promotions for all sellers
      const sellerIds = [...new Set(data.map(p => p.seller_id))];
      if (sellerIds.length > 0) {
        const [profilesRes, promosRes] = await Promise.all([
          supabase
            .from("profiles_public")
            .select("user_id, is_verified")
            .in("user_id", sellerIds)
            .eq("is_verified", true),
          supabase
            .from("promotions")
            .select("user_id, discount_type, discount_value, target_id")
            .in("user_id", sellerIds)
            .eq("is_active", true)
            .gt("end_date", new Date().toISOString()),
        ]);
        if (profilesRes.data) {
          setVerifiedSellers(new Set(profilesRes.data.map(p => p.user_id!)));
        }
        if (promosRes.data && promosRes.data.length > 0) {
          // Map seller_id -> best promotion (highest discount)
          const promoMap = new Map<string, { discount_type: string; discount_value: number }>();
          for (const p of promosRes.data) {
            if (!p.user_id) continue;
            const existing = promoMap.get(p.user_id);
            if (!existing || (p.discount_value || 0) > existing.discount_value) {
              promoMap.set(p.user_id, {
                discount_type: p.discount_type || "percentage",
                discount_value: p.discount_value || 0,
              });
            }
          }
          setPromotions(promoMap);
        }
      // Fetch product ratings
      const productIds = data.map(p => p.id);
      if (productIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);
        if (reviewsData) {
          const ratingMap = new Map<string, number>();
          const countMap = new Map<string, number>();
          for (const r of reviewsData) {
            if (!r.product_id) continue;
            ratingMap.set(r.product_id, (ratingMap.get(r.product_id) || 0) + r.rating);
            countMap.set(r.product_id, (countMap.get(r.product_id) || 0) + 1);
          }
          const avgMap = new Map<string, number>();
          for (const [id, total] of ratingMap) {
            avgMap.set(id, total / (countMap.get(id) || 1));
          }
          setProductRatings(avgMap);
        }
      }
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("type", "product");

    if (!error && data) {
      setCategories(data);
    }
  };

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  const filteredProducts = useMemo(() => products
    .filter((product) => {
      const matchesSearch = product.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchesCategory = !filters.selectedCategory || product.category_id === filters.selectedCategory;
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
      const matchesLocation = !filters.location || product.location?.toLowerCase().includes(filters.location.toLowerCase());
      const matchesRating = filters.minRating === 0 || (productRatings.get(product.id) || 0) >= filters.minRating;
      return matchesSearch && matchesCategory && matchesPrice && matchesLocation && matchesRating;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating-desc":
          return (productRatings.get(b.id) || 0) - (productRatings.get(a.id) || 0);
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    }), [products, filters, productRatings]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Marketplace" description="Découvrez des milliers de produits authentiques africains sur MIYASHI. Artisanat, mode, tech et plus." canonical="/marketplace" />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
              Marketplace
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Découvrez des milliers de produits authentiques africains, de l'artisanat local aux dernières technologies.
            </p>
          </motion.div>

          {/* Filters Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4 shadow-card mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                  className="pl-12 h-12 rounded-xl border-muted"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={filters.selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilters({ selectedCategory: null })}
                  className="rounded-full"
                >
                  Tous
                </Button>
                {categories.slice(0, 4).map((category) => (
                  <Button
                    key={category.id}
                    variant={filters.selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters({ selectedCategory: category.id })}
                    className="rounded-full"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Sort & View Controls */}
              <div className="flex items-center gap-2">
                <Select value={filters.sortBy} onValueChange={(v) => updateFilters({ sortBy: v })}>
                  <SelectTrigger className="w-40 h-10 rounded-xl">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Plus récents</SelectItem>
                    <SelectItem value="oldest">Plus anciens</SelectItem>
                    <SelectItem value="price-asc">Prix croissant</SelectItem>
                    <SelectItem value="price-desc">Prix décroissant</SelectItem>
                    <SelectItem value="rating-desc">Meilleures notes</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex items-center border rounded-xl p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Advanced Filters */}
                <AdvancedSearchFilters
                  filters={filters}
                  onFiltersChange={updateFilters}
                  onReset={resetFilters}
                  categories={categories}
                  type="product"
                />
              </div>
            </div>
          </motion.div>

          {/* Active Filter Pills */}
          <ActiveFilterPills filters={filters} categories={categories} onFiltersChange={updateFilters} />

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredProducts.length}</span> produits trouvés
            </p>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className={cn(
              "grid gap-6",
              viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
            )}>
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <Button onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className={cn(
                "grid gap-6",
                viewMode === "grid" 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1"
              )}
            >
              <AnimatePresence mode="popLayout">
                {paginatedProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    variants={item}
                    layout
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <Card className={cn(
                      "overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-elevated border-0 shadow-card",
                      viewMode === "list" && "flex flex-row"
                    )}>
                      <div className={cn(
                        "relative bg-muted overflow-hidden",
                        viewMode === "grid" ? "aspect-square" : "w-48 h-48"
                      )}>
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Quick Actions Overlay */}
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}>
                            <Heart className={`h-4 w-4 ${isFavorite(product.id) ? "fill-destructive text-destructive" : ""}`} />
                          </Button>
                          <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={() => navigate(`/product/${product.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="hero" className="rounded-full h-10 w-10" onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}>
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Stock Badge */}
                        {product.stock && product.stock <= 5 && !promotions.has(product.seller_id) && (
                          <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">
                            Plus que {product.stock}
                          </Badge>
                        )}

                        {/* Promo Badge */}
                        {promotions.has(product.seller_id) && (
                          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground font-bold">
                            {promotions.get(product.seller_id)!.discount_type === "percentage"
                              ? `-${promotions.get(product.seller_id)!.discount_value}%`
                              : `-${promotions.get(product.seller_id)!.discount_value.toLocaleString()}F`}
                          </Badge>
                        )}
                      </div>

                      <div className={cn("flex-1", viewMode === "list" && "p-4")}>
                        <CardContent className={cn(viewMode === "grid" && "p-4")}>
                          <div className="flex items-center gap-1 mb-2">
                          {(() => {
                            const rating = productRatings.get(product.id) || 0;
                            const reviewCount = rating > 0 ? Math.ceil(rating) : 0;
                            return (
                              <>
                                {[1,2,3,4,5].map((star) => (
                                  <Star key={star} className={`h-3 w-3 ${star <= Math.round(rating) ? "fill-primary text-primary" : "text-muted"}`} />
                                ))}
                                <span className="text-xs text-muted-foreground ml-1">({rating > 0 ? rating.toFixed(1) : "0"})</span>
                              </>
                            );
                          })()}
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {product.title}
                            </h3>
                            {verifiedSellers.has(product.seller_id) && (
                              <Badge variant="secondary" className="shrink-0 gap-0.5 text-[10px] px-1.5 py-0 h-5">
                                <CheckCircle className="h-3 w-3 text-primary" />
                                Vérifié
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {product.description}
                          </p>
                          {product.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {product.location}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className={cn(
                          "flex justify-between items-center",
                          viewMode === "grid" ? "px-4 pb-4" : "p-0"
                        )}>
                          {(() => {
                            const promo = promotions.get(product.seller_id);
                            if (promo) {
                              const discounted = promo.discount_type === "percentage"
                                ? Math.round(product.price * (1 - promo.discount_value / 100))
                                : Math.max(0, product.price - promo.discount_value);
                              return (
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground line-through">
                                    {product.price.toLocaleString()} FCFA
                                  </span>
                                  <span className="text-xl font-bold text-destructive">
                                    {discounted.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <span className="text-xl font-bold text-primary">
                                {product.price.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                              </span>
                            );
                          })()}
                          <Badge variant="outline" className="text-xs">
                            Stock: {product.stock}
                          </Badge>
                        </CardFooter>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Précédent
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
