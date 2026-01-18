import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ThumbsUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  is_verified: boolean;
  created_at: string;
  reviewer?: {
    full_name: string;
    avatar_url: string;
  };
}

interface ReviewsListProps {
  productId?: string;
  serviceId?: string;
  userId?: string;
}

const ReviewsList = ({ productId, serviceId, userId }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0]
  });

  useEffect(() => {
    fetchReviews();
  }, [productId, serviceId, userId]);

  const fetchReviews = async () => {
    let query = supabase.from("reviews").select("*");

    if (productId) {
      query = query.eq("product_id", productId);
    } else if (serviceId) {
      query = query.eq("service_id", serviceId);
    } else if (userId) {
      query = query.eq("reviewed_user_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch reviewer profiles
      const reviewsWithProfiles = await Promise.all(
        data.map(async (review) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", review.reviewer_id)
            .maybeSingle();

          return {
            ...review,
            reviewer: profile || undefined
          };
        })
      );

      setReviews(reviewsWithProfiles);

      // Calculate stats
      if (data.length > 0) {
        const total = data.length;
        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        const distribution = [0, 0, 0, 0, 0];
        data.forEach(r => distribution[r.rating - 1]++);

        setStats({
          average: sum / total,
          total,
          distribution
        });
      }
    }
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des avis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-foreground">
                {stats.average.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mt-2">
                {renderStars(Math.round(stats.average))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total} avis
              </p>
            </div>

            <div className="flex-1 space-y-2 w-full max-w-md">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating - 1];
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-4 text-sm text-muted-foreground">{rating}</span>
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <span className="w-8 text-sm text-muted-foreground text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun avis pour le moment</p>
          <p className="text-sm mt-2">Soyez le premier à laisser un avis</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.reviewer?.avatar_url} />
                      <AvatarFallback>
                        {review.reviewer?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {review.reviewer?.full_name || "Utilisateur"}
                          </span>
                          {review.is_verified && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Vérifié
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>

                      <div className="mt-1">
                        {renderStars(review.rating)}
                      </div>

                      {review.comment && (
                        <p className="mt-3 text-foreground">
                          {review.comment}
                        </p>
                      )}

                      {/* Seller Response */}
                      {review.response && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Réponse du vendeur
                          </p>
                          <p className="text-sm">{review.response}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-4">
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          Utile
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
