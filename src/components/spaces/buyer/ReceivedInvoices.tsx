// Invoices that providers sent to the buyer, with a link to the printable version.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, Section, dateFr, fcfa } from "../kit";

type Row = { id: string; number: string; status: string; total: number; issued_at: string; due_date: string | null; provider_id: string; provider?: string };

export default function ReceivedInvoices() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("provider_invoices").select("id, number, status, total, issued_at, due_date, provider_id").eq("client_id", user.id).neq("status", "draft")
      .order("issued_at", { ascending: false }).then(async ({ data }) => {
        const list = (data ?? []) as Row[];
        const ids = [...new Set(list.map((r) => r.provider_id))];
        const { data: ps } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
        setRows(list.map((r) => ({ ...r, provider: ps?.find((p) => p.user_id === r.provider_id)?.full_name ?? "Prestataire" })));
      });
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <Section title="Factures reçues" description="Les factures que vos prestataires vous ont envoyées. Les reçus de vos commandes sont dans « Commandes ».">
        {rows === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : rows.length === 0 ? (
          <Empty icon={FileText} title="Aucune facture pour l'instant" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.number} · {r.provider}</p>
                  <p className="text-xs text-muted-foreground">Émise le {dateFr(r.issued_at)}{r.due_date ? ` · échéance ${dateFr(r.due_date)}` : ""}</p>
                </div>
                <span className="font-semibold tabular-nums">{fcfa(r.total)}</span>
                <Badge variant={r.status === "paid" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>{r.status === "paid" ? "Payée" : r.status === "cancelled" ? "Annulée" : "À payer"}</Badge>
                <Button size="sm" variant="outline" asChild><Link to={`/facture/${r.id}`} target="_blank"><Printer className="w-4 h-4 mr-1" />Voir</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Devis reçus" description="Acceptez un devis pour payer la prestation : le montant reste en séquestre jusqu'à la fin du travail.">
        <Button asChild><Link to="/quotes">Ouvrir mes devis</Link></Button>
      </Section>
    </div>
  );
}
