// Back from FedaPay after a direct mobile-money payment (#3): confirm, then show the orders.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { confirmFedapayTopup } from "@/lib/fedapay";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";

type Result = { orders: { order_id: string; total_price: number }[]; errors: { error: string }[] };

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const tx = params.get("topup");
  const [state, setState] = useState<"checking" | "done" | "partial" | "failed" | "pending">("checking");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!tx) { setState("failed"); return; }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 10 && !cancelled; i++) {
        const status = await confirmFedapayTopup(tx);
        if (["declined", "canceled", "failed"].includes(status)) { setState("failed"); return; }
        const { data } = await supabase.from("fedapay_transactions").select("credited_at, checkout:pending_checkouts(status, result)").eq("id", tx).maybeSingle();
        const ck = (data as any)?.checkout;
        if (data?.credited_at && ck && ck.status !== "pending") {
          setResult(ck.result as Result);
          setState(ck.status === "completed" ? "done" : "partial");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setState("pending");
    })();
    return () => { cancelled = true; };
  }, [tx]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center"><CardContent className="p-8 space-y-4">
          {state === "checking" && (<><Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" /><h1 className="text-2xl font-display font-bold">Confirmation du paiement…</h1><p className="text-muted-foreground">Nous vérifions votre paiement auprès de FedaPay.</p></>)}
          {state === "done" && (<><CheckCircle2 className="w-14 h-14 mx-auto text-accent" /><h1 className="text-2xl font-display font-bold">Commande payée</h1>
            <p className="text-muted-foreground">{result?.orders.length} commande{(result?.orders.length ?? 0) > 1 ? "s" : ""} créée{(result?.orders.length ?? 0) > 1 ? "s" : ""}. L'argent est bloqué en séquestre jusqu'à votre confirmation de réception.</p>
            <Button asChild className="w-full"><Link to="/dashboard">Suivre mes commandes</Link></Button></>)}
          {state === "partial" && (<><AlertTriangle className="w-14 h-14 mx-auto text-primary" /><h1 className="text-2xl font-display font-bold">Commande en partie passée</h1>
            <p className="text-muted-foreground">{result?.orders.length} article(s) commandé(s). Les autres n'étaient plus disponibles : leur montant est sur votre portefeuille.</p>
            <ul className="text-sm text-left text-muted-foreground list-disc pl-5">{result?.errors.map((e, i) => <li key={i}>{e.error}</li>)}</ul>
            <div className="flex gap-2"><Button asChild className="flex-1"><Link to="/dashboard">Mes commandes</Link></Button><Button asChild variant="outline" className="flex-1"><Link to="/wallet">Portefeuille</Link></Button></div></>)}
          {state === "pending" && (<><Loader2 className="w-12 h-12 mx-auto text-muted-foreground" /><h1 className="text-2xl font-display font-bold">Paiement en attente</h1>
            <p className="text-muted-foreground">Validez le paiement sur votre téléphone. La commande sera créée automatiquement dès sa confirmation ; vous recevrez une notification.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Vérifier à nouveau</Button></>)}
          {state === "failed" && (<><XCircle className="w-14 h-14 mx-auto text-destructive" /><h1 className="text-2xl font-display font-bold">Paiement non abouti</h1>
            <p className="text-muted-foreground">Aucun montant n'a été prélevé pour cette commande.</p><Button asChild><Link to="/checkout">Réessayer</Link></Button></>)}
        </CardContent></Card>
      </main>
      <Footer />
    </div>
  );
}
