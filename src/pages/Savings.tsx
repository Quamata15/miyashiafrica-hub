// Savings goals: pay for an item in several times (#7).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PiggyBank } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Savings() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Tables<"savings_goals">[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const load = () => user && supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setGoals(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const contribute = async (g: Tables<"savings_goals">) => {
    const { data, error } = await supabase.rpc("contribute_savings", { p_goal_id: g.id, p_amount: Number(amounts[g.id] || 0) });
    if (error) return toast.error(errMsg(error), errMsg(error).includes("Solde") ? { action: { label: "Recharger", onClick: () => (window.location.href = "/wallet") } } : undefined);
    const r = data as { completed?: boolean; price_changed?: boolean; error?: string };
    if (r.completed) toast.success("Objectif atteint : votre commande est passée !");
    else if (r.price_changed) toast.message("Le prix a changé : le nouvel objectif a été mis à jour.");
    else if (r.error) toast.error(`Objectif atteint mais commande impossible : ${r.error}. Votre épargne est conservée.`);
    else toast.success("Versement enregistré");
    setAmounts({ ...amounts, [g.id]: "" });
    load();
  };
  const cancel = async (g: Tables<"savings_goals">) => {
    if (!confirm(g.saved_amount > 0 ? `Annuler et récupérer ${fcfa(g.saved_amount)} sur votre portefeuille ?` : "Retirer cette demande d'épargne ?")) return;
    const { error } = await supabase.rpc("cancel_savings", { p_goal_id: g.id });
    if (error) return toast.error(errMsg(error));
    toast.success("Épargne rendue sur votre portefeuille");
    load();
  };

  return (
    <PageShell title="Mon épargne" description="Petits dépôts ou 2 à 5 tranches : le vendeur réserve l'article, la commande part toute seule quand le montant est atteint.">
      {!goals.length ? (
        <EmptyState icon={<PiggyBank className="w-6 h-6" />} title="Aucune épargne en cours">Sur une fiche produit ou au paiement, choisissez « Payer par épargne ». <Link to="/marketplace" className="text-primary underline">Voir les produits</Link></EmptyState>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            const left = g.target_amount - g.saved_amount;
            const minPay = g.plan === "installments" && g.installment_amount ? Math.min(g.installment_amount, left) : 100;
            const label: Record<string, string> = { pending_seller: "En attente du vendeur", active: `${pct} %`, completed: "Commandé", cancelled: "Annulée", refused: "Refusée", expired: "Expirée" };
            return (
              <Card key={g.id}><CardContent className="p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={g.product_id ? `/product/${g.product_id}` : "#"} className="font-semibold hover:text-primary">{g.title}</Link>
                    <p className="text-sm text-muted-foreground">{fcfa(g.saved_amount)} sur {fcfa(g.target_amount)}{g.quantity > 1 ? ` · ${g.quantity} pièces` : ""}
                      {" · "}{g.plan === "installments" ? `${g.installments} tranches de ${fcfa(g.installment_amount ?? 0)}` : "petits dépôts"}
                      {g.deadline ? ` · avant le ${new Date(g.deadline).toLocaleDateString("fr-FR")}` : ""}</p>
                  </div>
                  <Badge className="shrink-0" variant={g.status === "completed" || g.status === "active" ? "default" : g.status === "pending_seller" ? "outline" : "secondary"}>{label[g.status] ?? g.status}</Badge>
                </div>
                {g.status === "pending_seller" && <p className="text-sm text-muted-foreground">Le vendeur doit accepter et réserver l'article. Vous pourrez verser dès son accord.</p>}
                {g.status === "refused" && <p className="text-sm text-muted-foreground">Le vendeur n'a pas pu réserver cet article{g.refused_reason ? ` : ${g.refused_reason}` : ""}.</p>}
                {g.status === "active" && g.reserved_qty > 0 && <p className="text-sm text-emerald-600 dark:text-emerald-400">Réservé pour vous par le vendeur ({g.reserved_qty} pièce{g.reserved_qty > 1 ? "s" : ""}).
                  {g.plan === "installments" && g.next_due_date ? ` Prochaine tranche : ${fcfa(minPay)} avant le ${new Date(g.next_due_date).toLocaleDateString("fr-FR")}.` : ""}</p>}
                {(g.status === "active" || g.status === "completed") && <Progress value={pct} aria-label={`Épargne ${pct} %`} />}
                {g.status === "active" && (
                  <div className="flex flex-wrap gap-2">
                    <Input type="number" inputMode="numeric" min={minPay} placeholder={g.plan === "installments" ? `Tranche : ${fcfa(minPay)}` : "Montant à verser"} value={amounts[g.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [g.id]: e.target.value })} className="w-44" aria-label="Montant à verser" />
                    <Button onClick={() => contribute(g)} disabled={!amounts[g.id]}>Verser</Button>
                    {g.plan === "installments" && <Button variant="outline" onClick={() => setAmounts({ ...amounts, [g.id]: String(minPay) })}>Une tranche</Button>}
                    <Button variant="ghost" onClick={() => setAmounts({ ...amounts, [g.id]: String(left) })}>Le reste ({fcfa(left)})</Button>
                    <Button variant="ghost" className="text-destructive ml-auto" onClick={() => cancel(g)}>Annuler</Button>
                  </div>
                )}
                {g.status === "pending_seller" && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cancel(g)}>Retirer la demande</Button>}
                {g.status === "completed" && g.order_id && <Link to="/dashboard" className="text-sm text-primary underline">Suivre la commande</Link>}
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
