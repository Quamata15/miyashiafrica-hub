import { forwardRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Eye, ShoppingCart, Star, MapPin, Package, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { getOptimizedImageUrl } from "@/utils/imageOptimization";

type Product = Tables<"products">;

interface MarketplaceProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  toggleFavorite: (id: string) => void;
  addToCart: (id: string) => void;
  rating: number;
  isVerified: boolean;
  promotion?: { discount_type: string; discount_value: number };
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const MarketplaceProductCard = memo(forwardRef<HTMLDivElement, MarketplaceProductCardProps>(({
  product, viewMode, isFavorite: fav, toggleFavorite, addToCart,
  rating, isVerified, promotion,
}, ref) => {
  const navigate = useNavigate();

  return (
    <motion.div ref={ref} variants={item} layout onClick={() => navigate(`/product/${product.id}`)}>
      <Card className={cn(
        "overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-elevated border-0 shadow-card",
        viewMode === "list" && "flex flex-row"
      )}>
        <div className={cn(
          "relative bg-muted overflow-hidden",
          viewMode === "grid" ? "aspect-square" : "w-48 h-48"
        )}>
          {product.images && product.images[0] ? (
            <img src={getOptimizedImageUrl(product.images[0], 400, 400)} alt={product.title} loading="lazy"
              width={400} height={400}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}>
              <Heart className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : ""}`} />
            </Button>
            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10"
              onClick={() => navigate(`/product/${product.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="hero" className="rounded-full h-10 w-10"
              onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>

          {/* Stock Badge */}
          {product.stock && product.stock <= 5 && !promotion && (
            <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">
              Plus que {product.stock}
            </Badge>
          )}

          {/* Promo Badge */}
          {promotion && (
            <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground font-bold">
              {promotion.discount_type === "percentage"
                ? `-${promotion.discount_value}%`
                : `-${promotion.discount_value.toLocaleString()}F`}
            </Badge>
          )}
        </div>

        <div className={cn("flex-1", viewMode === "list" && "p-4")}>
          <CardContent className={cn(viewMode === "grid" && "p-4")}>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-3 w-3 ${star <= Math.round(rating) ? "fill-primary text-primary" : "text-muted"}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">({rating > 0 ? rating.toFixed(1) : "0"})</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {product.title}
              </h3>
              {isVerified && (
                <Badge variant="secondary" className="shrink-0 gap-0.5 text-[10px] px-1.5 py-0 h-5">
                  <CheckCircle className="h-3 w-3 text-primary" /> Vérifié
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
            {product.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {product.location}
              </div>
            )}
          </CardContent>
          <CardFooter className={cn(
            "flex justify-between items-center",
            viewMode === "grid" ? "px-4 pb-4" : "p-0"
          )}>
            {promotion ? (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground line-through">
                  {product.price.toLocaleString()} FCFA
                </span>
                <span className="text-xl font-bold text-destructive">
                  {(promotion.discount_type === "percentage"
                    ? Math.round(product.price * (1 - promotion.discount_value / 100))
                    : Math.max(0, product.price - promotion.discount_value)
                  ).toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-primary">
                {product.price.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
              </span>
            )}
            <Badge variant="outline" className="text-xs">Stock: {product.stock}</Badge>
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  );
}));

MarketplaceProductCard.displayName = "MarketplaceProductCard";

export default MarketplaceProductCard;
