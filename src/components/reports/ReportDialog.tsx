import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportDialogProps {
  targetType: "product" | "service" | "user" | "review";
  targetId: string;
  trigger?: React.ReactNode;
}

const REASONS = [
  { value: "spam", label: "Spam ou arnaque" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "counterfeit", label: "Contrefaçon" },
  { value: "harassment", label: "Harcèlement" },
  { value: "other", label: "Autre" },
];

const ReportDialog = ({ targetType, targetId, trigger }: ReportDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour signaler");
      return;
    }
    if (!reason) {
      toast.error("Veuillez sélectionner une raison");
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase.from("reports") as any).insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description.trim() || null,
    });

    if (error) {
      toast.error("Erreur lors du signalement");
    } else {
      toast.success("Signalement envoyé. Merci pour votre vigilance.");
      setOpen(false);
      setReason("");
      setDescription("");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-1" /> Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler ce contenu</DialogTitle>
          <DialogDescription>
            Aidez-nous à maintenir une communauté saine. Votre signalement sera examiné par notre équipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Raison du signalement</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Détails supplémentaires (optionnel)</Label>
            <Textarea
              placeholder="Décrivez le problème..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason} variant="destructive">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Flag className="h-4 w-4 mr-1" />}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
