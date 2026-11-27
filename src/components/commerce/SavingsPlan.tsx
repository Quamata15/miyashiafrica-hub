// Pay by savings: free small deposits or 2 to 5 instalments over a chosen duration.
// The request goes to the seller, who accepts (the items are then held aside) or refuses.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PiggyBank, Loader2 } from "lucide-react";

export type PlanChoice = { plan: "free" | "installments"; installments: number; days: number };
const DURATIONS = [30, 60, 90, 120, 180];

/** Plan picker with the schedule it implies. Used on the product page and at checkout. */
export function SavingsPlanPicker({ total, value, onChange }: { total: number; value: PlanChoice; onChange: (v: PlanChoice) => void }) {
  const each = value.plan === "installments" ? Math.ceil(total / value.installments) : 0;
  const step = value.plan === "installments" ? Math.max(1, Math.floor(value.days / value.installments)) : 0;
  const due = (i: number) => new Date(Date.now() + i * step * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const chip = (on: boolean) => `rounded-lg border px-3 py-1.5 text-sm transition-colors ${on ? "border-primary bg-primary/10 text-foreground" : "border-foreground/15 text-muted-foreground hover:border-primary/40"}`;
  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1.5 block">Formule</Label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(value.plan === "free")} aria-pressed={value.plan === "free"} onClick={() => onChange({ ...value, plan: "free" })}>Petits dépôts libres</button>
          {[2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={chip(value.plan === "installments" && value.installments === n)} aria-pressed={value.plan === "installments" && value.installments === n}
              onClick={() => onChange({ ...value, plan: "installments", installments: n })}>{n} tranches</button>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block">Durée de l'épargne</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => <button key={d} type="button" className={chip(value.days === d)} aria-pressed={value.days === d} onClick={() => onChange({ ...value, days: d })}>{d} jours</button>)}
        </div>
      </div>
      <div className="rounded-xl bg-muted/40 p-3 text-sm">
        {value.plan === "free" ? (
          <p>Versez quand vous voulez (100 FCFA minimum) jusqu'à atteindre <strong>{fcfa(total)}</strong> avant {value.days} jours. La commande part toute seule.</p>
        ) : (
          <>
            <p className="mb-1.5">{value.installments} tranches de <strong>{fcfa(each)}</strong>, une tous les {step} jours :</p>
            <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {Array.from({ length: value.installments }, (_, i) => <li key={i}>{i + 1}. {due(i)} · {fcfa(i === value.installments - 1 ? total - each * (value.installments - 1) : each)}</li>)}
            </ol>
          </>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Le vendeur doit accepter : il réserve alors l'article pour vous. S'il refuse ou si la date passe, votre argent revient sur votre portefeuille.</p>
      </div>
    </div>
  );
}

export async function requestSavingsPlan(p: { productId: string; variantId?: string | null; quantity: number; choice: PlanChoice; addressId?: string | null }) {
  const { error } = await supabase.rpc("create_savings_plan", {
    p_product_id: p.productId, p_quantity: p.quantity, p_variant_id: p.variantId ?? undefined,
    p_plan: p.choice.plan, p_installments: p.choice.plan === "installments" ? p.choice.installments : undefined,
    p_duration_days: p.choice.days, p_address_id: p.addressId ?? undefined,
  });
  if (error) throw error;
}

export function SavingsPlanDialog({ open, onOpenChange, productId, variantId, quantity, total }: {
  open: boolean; onOpenChange: (o: boolean) => void; productId: string; variantId?: string | null; quantity: number; total: number;
}) {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<PlanChoice>({ plan: "installments", installments: 3, days: 90 });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await requestSavingsPlan({ productId, variantId, quantity, choice });
      toast.success("Demande envoyée au vendeur. Vous serez prévenu dès sa réponse.");
      onOpenChange(false);
      navigate("/savings");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PiggyBank className="w-5 h-5 text-primary" />Payer par épargne</DialogTitle>
          <DialogDescription>{quantity > 1 ? `${quantity} pièces · ` : ""}{fcfa(total)}</DialogDescription>
        </DialogHeader>
        <SavingsPlanPicker total={total} value={choice} onChange={setChoice} />
        <DialogFooter><Button onClick={send} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Envoyer la demande au vendeur</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
