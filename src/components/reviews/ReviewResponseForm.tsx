import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ReviewResponseFormProps {
  reviewId: string;
  onSuccess?: () => void;
}

const ReviewResponseForm = ({ reviewId, onSuccess }: ReviewResponseFormProps) => {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("reviews")
      .update({ response: response.trim() })
      .eq("id", reviewId);

    if (error) {
      toast.error("Erreur lors de l'envoi de la réponse");
    } else {
      toast.success("Réponse publiée");
      setResponse("");
      setShowForm(false);
      onSuccess?.();
    }
    setSubmitting(false);
  };

  if (!showForm) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setShowForm(true)} className="text-muted-foreground">
        <MessageSquare className="h-4 w-4 mr-1" /> Répondre
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        placeholder="Répondez à cet avis..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={2}
        maxLength={500}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !response.trim()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Publier
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
      </div>
    </div>
  );
};

export default ReviewResponseForm;
