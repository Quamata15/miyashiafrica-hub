// Verified review: only after a received order or a finished service (checked by the database),
// with up to 4 photos. target "driver" rates the driver of that order.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { compressImage } from "@/lib/upload";
import { errMsg } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ImagePlus, X, Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

interface ReviewFormProps {
  productId?: string;
  serviceId?: string;
  reviewedUserId?: string;
  orderId?: string;
  target?: "listing" | "driver";
  onSuccess?: () => void;
}

const ReviewForm = ({ productId, serviceId, orderId, target = "listing", onSuccess }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState<string | null | undefined>(orderId ?? undefined);
  const [done, setDone] = useState(false);

  // Without an order given, find the person's received order for this item.
  useEffect(() => {
    if (orderId || !user || (!productId && !serviceId)) return;
    let q = supabase.from("orders").select("id").eq("buyer_id", user.id).in("status", ["completed", "shipped"]).order("created_at", { ascending: false }).limit(1);
    q = productId ? q.eq("product_id", productId) : q.eq("service_id", serviceId!);
    q.maybeSingle().then(async ({ data }) => {
      if (!data) return setEligible(null);
      const { data: r } = await supabase.from("reviews").select("id").eq("order_id", data.id).eq("reviewer_id", user.id).eq("target", target).maybeSingle();
      if (r) setDone(true);
      setEligible(data.id);
    });
  }, [orderId, user, productId, serviceId, target]);

  const addPhoto = async (file?: File) => {
    if (!user || !file || photos.length >= 4) return;
    setUploading(true);
    try {
      const f = await compressImage(file, 1400, 0.82);
      const path = `${user.id}/${Date.now()}.${f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg"}`;
      const { error } = await supabase.storage.from("review-photos").upload(path, f, { contentType: f.type });
      if (error) throw error;
      setPhotos((p) => [...p, supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl]);
    } catch (e) { toast.error(errMsg(e)); } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!user || !eligible || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id, reviewed_user_id: user.id, order_id: eligible, rating, comment: comment.trim() || null, photos, target,
      product_id: productId ?? null, service_id: serviceId ?? null,
    });
    setSubmitting(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Merci pour votre avis !");
    setDone(true); setRating(0); setComment(""); setPhotos([]);
    onSuccess?.();
  };

  if (!user) return null;
  if (eligible === undefined) return null;
  if (eligible === null) return <p className="text-sm text-muted-foreground">Vous pourrez donner votre avis après avoir reçu votre commande ou une fois la prestation terminée.</p>;
  if (done) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><BadgeCheck className="w-4 h-4 text-emerald-500" />Vous avez déjà donné votre avis. Merci !</p>;

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{target === "driver" ? "Noter le livreur" : "Votre avis"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} sur 5`} onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} className="p-0.5">
              <Star className={`h-7 w-7 transition-colors ${star <= (hovered || rating) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>}
        </div>
        <Textarea placeholder={target === "driver" ? "Ponctualité, politesse, état du colis… (facultatif)" : "Qualité, conformité, ce que vous avez aimé… (facultatif)"} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        {target === "listing" && (
          <div className="flex flex-wrap gap-2">
            {photos.map((u, i) => (
              <div key={u} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Retirer la photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {photos.length < 4 && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary/50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => addPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
        )}
        <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full">{submitting ? "Publication…" : "Publier l'avis"}</Button>
        <p className="text-xs text-muted-foreground">Avis vérifié : il est lié à votre commande.</p>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
