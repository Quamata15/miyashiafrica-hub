// Chat safety: the rule shown above every conversation, and a way to report someone who asks to
// pay or talk outside MIYASHI.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export function ChatSafetyNotice() {
  return (
    <p className="mx-4 mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-amber-500" />
      Numéros, e-mails et liens WhatsApp sont masqués. Payez et échangez toujours sur MIYASHI : hors plateforme, vous n'êtes plus protégé
      et le vendeur ou le prestataire est sanctionné.
    </p>
  );
}

export function OffPlatformReport({ otherUserId }: { otherUserId: string }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("report_off_platform", { p_user: otherUserId, p_details: details });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Merci, l'équipe MIYASHI va examiner ce signalement.");
    setDetails(""); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Signaler une demande de paiement hors plateforme" title="Signaler une demande hors plateforme">
          <ShieldAlert className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler une demande hors plateforme</DialogTitle>
          <DialogDescription>Cette personne vous demande de payer ailleurs, de passer sur WhatsApp ou vous donne ses coordonnées ? Dites-nous ce qui s'est passé.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="opr-details">Ce qui s'est passé</Label>
          <Textarea id="opr-details" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex. : le vendeur m'a demandé de le payer directement par mobile money…" />
        </div>
        <DialogFooter><Button onClick={send} disabled={busy || details.trim().length < 10}>Envoyer le signalement</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
