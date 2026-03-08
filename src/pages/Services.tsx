import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Search, Clock, Wrench, Star, SlidersHorizontal, 
  Grid3X3, List, ArrowUpDown, CheckCircle, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;
type Category = Tables<"categories">;

const Services = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch active boosts to prioritize boosted services
      const { data: activeBoosts } = await (supabase.from("boosts") as any)
        .select("user_id, boost_type")
        .eq("is_active", true)
        .eq("boost_type", "service")
        .gt("expires_at", new Date().toISOString());

      const boostedProviderIds = new Set(
        (activeBoosts || []).map((b: any) => b.user_id)
      );

      // Sort: boosted services first, then by created_at desc
      const sorted = [...data].sort((a, b) => {
        const aBoost = boostedProviderIds.has(a.provider_id) ? 1 : 0;
        const bBoost = boostedProviderIds.has(b.provider_id) ? 1 : 0;
        if (bBoost !== aBoost) return bBoost - aBoost;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setServices(sorted);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("type", "service");

    if (!error && data) {
      setCategories(data);
    }
  };

  const filteredServices = services
    .filter((service) => {
      const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

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
      <SEOHead title="Services" description="Trouvez des prestataires qualifiés pour tous vos besoins. Design, développement, marketing et plus sur MIYASHI." canonical="/services" />
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
              Services Professionnels
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Trouvez des prestataires qualifiés pour tous vos besoins : développement, design, marketing, conseil et bien plus encore.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Prestataires actifs", value: "500+", icon: User },
              { label: "Services disponibles", value: services.length.toString(), icon: Wrench },
              { label: "Projets complétés", value: "1,200+", icon: CheckCircle },
              { label: "Clients satisfaits", value: "98%", icon: Star },
            ].map((stat, index) => (
              <Card key={stat.label} className="p-4 border-0 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
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
                  placeholder="Rechercher un service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-muted"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={selectedCategory === null ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full"
                >
                  Tous
                </Button>
                {categories.slice(0, 4).map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="rounded-full"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Sort & View Controls */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-10 rounded-xl">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Plus récents</SelectItem>
                    <SelectItem value="oldest">Plus anciens</SelectItem>
                    <SelectItem value="price-asc">Prix croissant</SelectItem>
                    <SelectItem value="price-desc">Prix décroissant</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex items-center border rounded-xl p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredServices.length}</span> services disponibles
            </p>
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className={cn(
              "grid gap-6",
              viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1"
            )}>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Wrench className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucun service trouvé</h3>
              <p className="text-muted-foreground mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <Button onClick={() => { setSearchTerm(""); setSelectedCategory(null); }}>
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
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              )}
            >
              <AnimatePresence mode="popLayout">
                {filteredServices.map((service) => (
                  <motion.div
                    key={service.id}
                    variants={item}
                    layout
                    onClick={() => navigate(`/service/${service.id}`)}
                  >
                    <Card className={cn(
                      "overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-elevated border-0 shadow-card",
                      viewMode === "list" && "flex flex-row"
                    )}>
                      <div className={cn(
                        "relative bg-muted overflow-hidden",
                        viewMode === "grid" ? "aspect-video" : "w-64 h-48"
                      )}>
                        {service.images && service.images[0] ? (
                          <img
                            src={service.images[0]}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                            <Wrench className="h-12 w-12 text-secondary" />
                          </div>
                        )}
                        
                        {/* Price Type Badge */}
                        <Badge className={cn(
                          "absolute top-3 left-3",
                          service.price_type === "fixed" 
                            ? "bg-accent text-accent-foreground" 
                            : "bg-secondary text-secondary-foreground"
                        )}>
                          {service.price_type === "fixed" ? "Prix fixe" : "À négocier"}
                        </Badge>
                      </div>

                      <div className={cn("flex-1 flex flex-col", viewMode === "list" && "p-4")}>
                        <CardContent className={cn("flex-1", viewMode === "grid" && "p-4")}>
                          {/* Provider Info */}
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="" />
                              <AvatarFallback className="text-xs bg-secondary/20">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map((star) => (
                                  <Star key={star} className="h-3 w-3 fill-primary text-primary" />
                                ))}
                                <span className="text-xs text-muted-foreground ml-1">(0)</span>
                              </div>
                            </div>
                          </div>

                          <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-secondary transition-colors">
                            {service.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {service.description}
                          </p>
                          
                          {service.delivery_days && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Livraison en {service.delivery_days} jours</span>
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className={cn(
                          "flex justify-between items-center border-t pt-4",
                          viewMode === "grid" ? "px-4 pb-4" : "p-0 border-0"
                        )}>
                          <div>
                            {service.price ? (
                              <span className="text-xl font-bold text-secondary">
                                {service.price.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Prix sur demande</span>
                            )}
                          </div>
                          <Button size="sm" variant="secondary" className="rounded-xl">
                            Voir détails
                          </Button>
                        </CardFooter>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
