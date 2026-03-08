import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Package, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  location: string | null;
}

interface Service {
  id: string;
  title: string;
  price: number | null;
  price_type: string | null;
  images: string[] | null;
}

const FeaturedSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, title, price, images, location")
            .eq("is_active", true)
            .limit(4),
          supabase
            .from("services")
            .select("id, title, price, price_type, images")
            .eq("is_active", true)
            .limit(4),
        ]);

        setProducts(productsRes.data || []);
        setServices(servicesRes.data || []);
      } catch (error) {
        console.error("Error fetching featured items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        {/* Featured Products */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Produits</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Produits en vedette
              </h2>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" className="group">
                Voir tout
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {loading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden border-0 shadow-card">
                      <Skeleton className="aspect-square" />
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-5 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
              : products.map((product) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Link to={`/product/${product.id}`}>
                      <Card className="overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                            Nouveau
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                            {product.title}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">
                              {product.price.toLocaleString()} FCFA
                            </span>
                            {product.location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {product.location}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
          </motion.div>
        </div>

        {/* Featured Services */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium text-secondary">Services</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Services populaires
              </h2>
            </div>
            <Link to="/services">
              <Button variant="outline" className="group">
                Voir tout
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {loading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden border-0 shadow-card">
                      <Skeleton className="aspect-video" />
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-5 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
              : services.map((service) => (
                  <motion.div key={service.id} variants={itemVariants}>
                    <Link to={`/service/${service.id}`}>
                      <Card className="overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {service.images?.[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                              <Briefcase className="w-12 h-12 text-secondary" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <h3 className="font-semibold text-white text-sm line-clamp-2">
                              {service.title}
                            </h3>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span className="text-sm font-medium">4.8</span>
                            </div>
                            <span className="font-bold text-secondary text-sm">
                              {service.price
                                ? `${service.price.toLocaleString()} FCFA`
                                : "Sur devis"}
                              {service.price_type === "hourly" && "/h"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
