import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FavoriteButtonProps {
  productId?: string;
  serviceId?: string;
  variant?: "icon" | "default";
  className?: string;
}

const FavoriteButton = ({ productId, serviceId, variant = "icon", className }: FavoriteButtonProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(productId, serviceId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleFavorite(productId, serviceId);
  };

  if (variant === "icon") {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        className={cn(
          "p-2 rounded-full transition-colors",
          isFav 
            ? "bg-red-500 text-white" 
            : "bg-background/80 backdrop-blur-sm hover:bg-background text-foreground",
          className
        )}
      >
        <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
      </motion.button>
    );
  }

  return (
    <Button
      variant={isFav ? "default" : "outline"}
      onClick={handleClick}
      className={cn(
        isFav && "bg-red-500 hover:bg-red-600",
        className
      )}
    >
      <Heart className={cn("h-4 w-4 mr-2", isFav && "fill-current")} />
      {isFav ? "Favori" : "Ajouter aux favoris"}
    </Button>
  );
};

export default FavoriteButton;
