import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, ThumbsUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import ReviewResponseForm from "./ReviewResponseForm";
import ReportDialog from "@/components/reports/ReportDialog";

interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string | null;
  rating: number;
  comment: string | null;
  response: string | null;
  is_verified: boolean;
  photos?: string[] | null;
  created_at: string;
  product_id: string | null;
  service_id: string | null;
  reviewer?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ReviewsListProps {
  productId?: string;
  serviceId?: string;
  userId?: string;
  sellerId?: string; // The product/service owner, to show response form
}

const ReviewsList = ({ productId, serviceId, userId, sellerId }: ReviewsListProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, total: 0, distribution: [0, 0, 0, 0, 0] });

  useEffect(() => {
    fetchReviews();
  }, [productId, serviceId, userId]);

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase.from("reviews").select("*").eq("target", "listing");

    if (productId) query = query.eq("product_id", productId);
    else if (serviceId) query = query.eq("service_id", serviceId);
    else if (userId) query = query.eq("reviewed_user_id", userId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch reviewer profiles from profiles_public
      const reviewerIds = [...new Set(data.map((r) => r.reviewer_id))];
      const profilesMap = new Map<string, { full_name: string | null; username: string | null; avatar_url: string | null }>();

      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", reviewerIds);
        if (profiles) {
          for (const p of profiles) {
            if (p.user_id) profilesMap.set(p.user_id, { full_name: p.full_name, username: p.username, avatar_url: p.avatar_url });
          }
        }
      }

      const reviewsWithProfiles = data.map((review) => ({
        ...review,
        reviewer: profilesMap.get(review.reviewer_id) || undefined,
      }));

      setReviews(reviewsWithProfiles);

      if (data.length > 0) {
        const total = data.length;
        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        const distribution = [0, 0, 0, 0, 0];
        data.forEach((r) => distribution[r.rating - 1]++);
        setStats({ average: sum / total, total, distribution });
      }
    }
    setLoading(false);
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );

  // Can the current user respond to reviews? (they're the seller/provider)
  const canRespond = user && sellerId && user.id === sellerId;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <Skeleton className="h-2 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <Card>
        <CardContent className="pt-4 sm:pt-5">
          <div className="flex flex-row items-center gap-5 md:gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-foreground">{stats.average.toFixed(1)}</div>
              <div className="flex items-center justify-center mt-2">{renderStars(Math.round(stats.average))}</div>
              <p className="text-sm text-muted-foreground mt-1">{stats.total} avis</p>
            </div>
            <div className="flex-1 space-y-1.5 w-full max-w-md">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating - 1];
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-4 text-sm text-muted-foreground">{rating}</span>
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-primary" />
                    </div>
                    <span className="w-8 text-sm text-muted-foreground text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-foreground/15 px-4 py-3 text-muted-foreground">
          <MessageSquare className="h-6 w-6 shrink-0 opacity-50" />
          <p className="text-sm">Aucun avis pour le moment. Soyez le premier à laisser un avis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => {
            const displayName = review.reviewer?.username || review.reviewer?.full_name || "Utilisateur";
            return (
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
                        <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                        <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{displayName}</span>
                            {review.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />Achat vérifié
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(review.created_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <div className="mt-1">{renderStars(review.rating)}</div>
                        {review.comment && <p className="mt-3 text-foreground">{review.comment}</p>}
                        {!!review.photos?.length && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {review.photos.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="Photo de l'acheteur" loading="lazy" className="h-20 w-20 rounded-lg object-cover border" /></a>)}
                          </div>
                        )}

                        {/* Seller Response */}
                        {review.response && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Réponse du vendeur</p>
                            <p className="text-sm">{review.response}</p>
                          </div>
                        )}

                        {/* Response form for seller/provider */}
                        {canRespond && !review.response && (
                          <ReviewResponseForm reviewId={review.id} onSuccess={fetchReviews} />
                        )}

                        <div className="flex items-center gap-4 mt-4">
                          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ThumbsUp className="h-4 w-4" />Utile
                          </button>
                          <ReportDialog targetType="review" targetId={review.id} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
