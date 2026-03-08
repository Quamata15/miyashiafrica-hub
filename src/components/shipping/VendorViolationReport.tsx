import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VendorViolationReportProps {
  orderId: string;
  sellerId: string;
}

const VendorViolationReport = ({ orderId, sellerId }: VendorViolationReportProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !description.trim()) return;
    setSubmitting(true);

    const { error } = await (supabase as any)
      .from("vendor_violations")
      .insert({
        seller_id: sellerId,
        reported_by: user.id,
        order_id: orderId,
        violation_type: "contact_on_package",
        description: description.trim(),
      });

    if (error) {
      toast.error("Erreur lors du signalement");
    } else {
      toast.success("Signalement envoyé. Notre équipe va examiner votre rapport.");
      setOpen(false);
      setDescription("");
    }
    setSubmitting(false);
  };

  if (!user || user.id === sellerId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs">
          <AlertTriangle className="h-3.5 w-3.5" />
          Coordonnées sur le colis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un contournement
          </DialogTitle>
          <DialogDescription>
            Si le vendeur a inscrit ses coordonnées personnelles (téléphone, adresse, réseaux sociaux) 
            directement sur le colis, signalez-le. Cette pratique est interdite pour protéger 
            acheteurs et vendeurs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5">
            <p className="font-medium">Politique de sanctions :</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li><strong>1ère infraction</strong> : Avertissement par email</li>
              <li><strong>2ème infraction</strong> : Suspension temporaire (7 jours)</li>
              <li><strong>3ème infraction</strong> : Suspension définitive du compte</li>
            </ul>
          </div>

          <Textarea
            placeholder="Décrivez ce que vous avez trouvé sur le colis (ex: numéro de téléphone écrit sur l'emballage, carte de visite insérée...)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorViolationReport;
