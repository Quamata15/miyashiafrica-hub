// Ask a provider for a service: no price needed. The request opens the conversation where both
// agree on the conditions; the provider then sends a quote with the terms, the client pays into
// escrow, and only then does the provider start.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export function ServiceRequestDialog({ open, onOpenChange, serviceId, serviceTitle }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; serviceTitle: string }) {
  const navigate = useNavigate();
  const [details, setDetails] = useState("");
  const [onSite, setOnSite] = useState(false);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("request_service", {
      p_service_id: serviceId, p_details: details, p_on_site: onSite, p_location: onSite ? location : undefined,
      p_date: date || undefined, p_budget: budget ? Number(budget) : undefined,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Demande envoyée : discutez des conditions avec le prestataire.");
    onOpenChange(false);
    navigate(`/messages?conversation=${(data as { conversation_id: string }).conversation_id}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander cette prestation</DialogTitle>
          <DialogDescription>{serviceTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sr-details">Votre besoin</Label>
            <Textarea id="sr-details" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ce que vous attendez, quantités, contraintes, délais…" />
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span><span className="font-medium block">Le prestataire se déplace</span><span className="text-muted-foreground">Sinon, la prestation se fait à distance.</span></span>
            <Switch checked={onSite} onCheckedChange={setOnSite} />
          </label>
          {onSite && (
            <div className="space-y-1.5">
              <Label htmlFor="sr-loc">Lieu (quartier, ville)</Label>
              <Input id="sr-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. : Bè, Lomé" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sr-date">Date souhaitée</Label>
              <Input id="sr-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-budget">Budget indicatif</Label>
              <Input id="sr-budget" type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Facultatif" />
            </div>
          </div>
          <p className="flex gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            Pas besoin de connaître le prix. Vous fixez ensemble les conditions dans la messagerie ; le prestataire vous envoie un devis. Vous payez sur MIYASHI et l'argent reste en séquestre jusqu'à la fin de la prestation.
          </p>
        </div>
        <DialogFooter><Button onClick={send} disabled={busy || details.trim().length < 10 || (onSite && location.trim().length < 2)}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Envoyer la demande</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Order a fixed-price service straight away: paid from the wallet, held in escrow. */
export async function orderFixedService(serviceId: string, notes?: string) {
  const { data, error } = await supabase.rpc("place_order", { p: { service_id: serviceId, payment_mode: "wallet", notes: notes || undefined } as never });
  if (error) throw error;
  return (data as { order_id: string }).order_id;
}

export function useRequireUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return () => { if (!user) { navigate("/auth"); return false; } return true; };
}
