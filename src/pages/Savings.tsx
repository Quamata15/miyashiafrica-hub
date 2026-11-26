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
    if (!confirm(`Annuler et récupérer ${fcfa(g.saved_amount)} sur votre portefeuille ?`)) return;
    const { error } = await supabase.rpc("cancel_savings", { p_goal_id: g.id });
    if (error) return toast.error(errMsg(error));
    toast.success("Épargne rendue sur votre portefeuille");
    load();
  };

  return (
    <PageShell title="Mon épargne" description="Mettez de côté petit à petit depuis votre portefeuille : la commande part toute seule quand le montant est atteint.">
      {!goals.length ? (
        <EmptyState icon={<PiggyBank className="w-6 h-6" />} title="Aucun objectif d'épargne">Sur une fiche produit, choisissez « Payer en plusieurs fois ». <Link to="/marketplace" className="text-primary underline">Voir les produits</Link></EmptyState>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            return (
              <Card key={g.id}><CardContent className="p-5 space-y-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <Link to={g.product_id ? `/product/${g.product_id}` : "#"} className="font-semibold hover:text-primary">{g.title}</Link>
                    <p className="text-sm text-muted-foreground">{fcfa(g.saved_amount)} sur {fcfa(g.target_amount)}{g.quantity > 1 ? ` · ${g.quantity} pièces` : ""}</p>
                  </div>
                  <Badge variant={g.status === "completed" ? "default" : g.status === "cancelled" ? "secondary" : "outline"}>{g.status === "active" ? `${pct} %` : g.status === "completed" ? "Commandé" : "Annulé"}</Badge>
                </div>
                <Progress value={pct} aria-label={`Épargne ${pct} %`} />
                {g.status === "active" && (
                  <div className="flex flex-wrap gap-2">
                    <Input type="number" inputMode="numeric" min={100} placeholder="Montant à verser" value={amounts[g.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [g.id]: e.target.value })} className="w-44" />
                    <Button onClick={() => contribute(g)} disabled={!amounts[g.id]}>Verser</Button>
                    <Button variant="ghost" onClick={() => setAmounts({ ...amounts, [g.id]: String(g.target_amount - g.saved_amount) })}>Le reste ({fcfa(g.target_amount - g.saved_amount)})</Button>
                    <Button variant="ghost" className="text-destructive ml-auto" onClick={() => cancel(g)}>Annuler</Button>
                  </div>
                )}
                {g.status === "completed" && g.order_id && <Link to="/dashboard" className="text-sm text-primary underline">Suivre la commande</Link>}
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
