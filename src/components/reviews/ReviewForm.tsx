import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReviewFormProps {
  productId?: string;
  serviceId?: string;
  reviewedUserId?: string;
  orderId?: string;
  onSuccess?: () => void;
}

const ReviewForm = ({ productId, serviceId, reviewedUserId, orderId, onSuccess }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour laisser un avis");
      return;
    }

    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    setSubmitting(true);

    try {
      // Check for existing review to prevent duplicates
      const targetColumn = productId ? "product_id" : "service_id";
      const targetValue = productId || serviceId;
      if (targetValue) {
        const { data: existing } = await supabase
          .from("reviews")
          .select("id")
          .eq("reviewer_id", user.id)
          .eq(targetColumn, targetValue)
          .maybeSingle();

        if (existing) {
          toast.error("Vous avez déjà laissé un avis pour cet article");
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        product_id: productId,
        service_id: serviceId,
        order_id: orderId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success("Avis publié avec succès");
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Erreur lors de la publication de l'avis");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Laisser un avis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </motion.button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 && `${rating}/5`}
          </span>
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Partagez votre expérience... (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || rating === 0}
          className="w-full"
        >
          {submitting ? "Publication..." : "Publier l'avis"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
