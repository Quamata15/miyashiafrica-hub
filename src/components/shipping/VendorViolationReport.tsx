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
import { MessageSquare, Loader2, Shield } from "lucide-react";
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
      toast.error("Erreur lors de l'envoi");
    } else {
      toast.success("Merci pour votre retour ! Notre équipe va examiner votre signalement.");
      setOpen(false);
      setDescription("");
    }
    setSubmitting(false);
  };

  if (!user || user.id === sellerId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
          <MessageSquare className="h-3.5 w-3.5" />
          Signaler un souci avec le colis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Nous aider à améliorer le service
          </DialogTitle>
          <DialogDescription>
            Vous avez remarqué quelque chose d'inhabituel sur votre colis ? 
            Par exemple, des coordonnées personnelles du vendeur inscrites sur l'emballage ? 
            Faites-le nous savoir pour qu'on puisse améliorer l'expérience pour tout le monde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-primary/5 rounded-lg p-3 text-xs space-y-1.5">
            <p className="font-medium text-primary">Pourquoi c'est important ?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Vos données personnelles restent protégées</li>
              <li>Les retours et litiges sont gérés plus facilement</li>
              <li>Le suivi de livraison fonctionne de manière optimale</li>
            </ul>
          </div>

          <Textarea
            placeholder="Décrivez ce que vous avez observé sur le colis (ex: un numéro de téléphone écrit sur l'emballage, une carte de visite glissée à l'intérieur...)"
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
