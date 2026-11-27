// Seller side of "pay by savings": accept (the items leave the stock, held for the buyer) or refuse.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PiggyBank } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Goal = Tables<"savings_goals">;

export default function SavingsRequests() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const load = () => user && supabase.from("savings_goals").select("*").eq("seller_id", user.id)
    .in("status", ["pending_seller", "active"]).order("created_at", { ascending: false }).limit(30)
    .then(({ data }) => setGoals(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const answer = async (g: Goal, accept: boolean) => {
    const reason = accept ? null : prompt("Motif du refus (facultatif, visible par l'acheteur)") ?? null;
    const { error } = await supabase.rpc("respond_savings_plan", { p_goal_id: g.id, p_accept: accept, p_reason: reason ?? undefined });
    if (error) return toast.error(errMsg(error));
    toast.success(accept ? `Accepté : ${g.quantity} pièce(s) réservée(s) pour l'acheteur` : "Demande refusée");
    load();
  };

  if (!goals.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><PiggyBank className="w-5 h-5 text-primary" />Achats par épargne</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
          return (
            <div key={g.id} className="rounded-xl border border-foreground/10 p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <Link to={`/product/${g.product_id}`} className="font-medium hover:text-primary">{g.quantity} × {g.title}</Link>
                  <p className="text-muted-foreground">{fcfa(g.target_amount)} · {g.plan === "installments" ? `${g.installments} tranches de ${fcfa(g.installment_amount ?? 0)}` : "petits dépôts libres"}
                    {g.deadline ? ` · jusqu'au ${new Date(g.deadline).toLocaleDateString("fr-FR")}` : ""}</p>
                </div>
                {g.status === "pending_seller" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => answer(g, true)}>Accepter et réserver</Button>
                    <Button size="sm" variant="outline" onClick={() => answer(g, false)}>Refuser</Button>
                  </div>
                ) : <span className="text-xs text-emerald-600 dark:text-emerald-400">Réservé · {pct} % versé</span>}
              </div>
              {g.status === "active" && <Progress value={pct} aria-label={`Épargne ${pct} %`} className="h-1.5" />}
              {g.status === "pending_seller" && <p className="text-xs text-muted-foreground">En acceptant, la quantité sort de votre stock et reste réservée jusqu'au paiement complet ou à la date limite.</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
