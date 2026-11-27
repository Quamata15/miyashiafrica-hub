// Quotes sent by providers and accepted online by clients (#32).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { useSpaces } from "@/hooks/useSpaces";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText } from "lucide-react";

type Q = { id: string; provider_id: string; client_id: string; title: string; items: { label: string; qty: number; unit_price: number }[]; total: number; notes: string | null; valid_until: string; status: string; created_at: string };
const LABEL: Record<string, string> = { sent: "En attente", accepted: "Accepté", rejected: "Refusé", expired: "Expiré", cancelled: "Retiré" };

export default function Quotes() {
  const { user } = useAuth();
  const sp = useSpaces();
  const [list, setList] = useState<Q[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("quotes").select("*").or(`client_id.eq.${user.id},provider_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100);
    const qs = (data ?? []) as unknown as Q[];
    setList(qs);
    const ids = [...new Set(qs.flatMap((q) => [q.client_id, q.provider_id]))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles_public").select("user_id, full_name").in("user_id", ids);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.user_id, x.full_name ?? "Utilisateur"])));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);
  const accept = async (q: Q) => {
    const { error } = await supabase.rpc("accept_quote", { p_quote_id: q.id });
    if (error) return toast.error(errMsg(error), errMsg(error).includes("Solde") ? { action: { label: "Recharger", onClick: () => (window.location.href = "/wallet") } } : undefined);
    toast.success("Devis accepté : le montant est bloqué en séquestre jusqu'à la fin de la prestation"); load();
  };
  const reject = async (q: Q) => { await supabase.rpc("reject_quote", { p_quote_id: q.id }); load(); };
  const card = (q: Q, asClient: boolean) => (
    <Card key={q.id}><CardContent className="p-5 space-y-3">
      <div className="flex justify-between gap-2"><div><p className="font-semibold">{q.title}</p><p className="text-sm text-muted-foreground">{asClient ? `De ${names[q.provider_id] ?? "…"}` : `Pour ${names[q.client_id] ?? "…"}`} · valable jusqu'au {new Date(q.valid_until).toLocaleDateString("fr-FR")}</p></div><Badge variant="outline">{LABEL[q.status]}</Badge></div>
      <table className="w-full text-sm"><tbody>{q.items.map((it, i) => <tr key={i} className="border-t border-foreground/10"><td className="py-1">{it.label}</td><td className="text-right">{it.qty} × {fcfa(it.unit_price)}</td><td className="text-right w-28">{fcfa(it.qty * it.unit_price)}</td></tr>)}
        <tr className="border-t border-foreground/20 font-bold"><td className="py-2" colSpan={2}>Total</td><td className="text-right">{fcfa(q.total)}</td></tr></tbody></table>
      {q.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{q.notes}</p>}
      {q.status === "sent" && (asClient ? (
        <div className="flex gap-2"><Button onClick={() => accept(q)}>Accepter et payer {fcfa(q.total)}</Button><Button variant="ghost" onClick={() => reject(q)}>Refuser</Button></div>
      ) : <Button variant="ghost" size="sm" onClick={() => reject(q)}>Retirer le devis</Button>)}
    </CardContent></Card>
  );
  const received = list.filter((q) => q.client_id === user?.id);
  const sent = list.filter((q) => q.provider_id === user?.id);
  const provider = sp.can("provide") || sent.length > 0;
  return (
    <PageShell title="Devis" description="Les devis s'envoient depuis la messagerie. Accepté, le montant est protégé par le séquestre.">
      <Tabs defaultValue={received.length || !sent.length ? "received" : "sent"}>
        <TabsList><TabsTrigger value="received">Reçus ({received.length})</TabsTrigger>{provider && <TabsTrigger value="sent">Envoyés ({sent.length})</TabsTrigger>}</TabsList>
        <TabsContent value="received" className="space-y-3 mt-4">{received.length ? received.map((q) => card(q, true)) : <EmptyState icon={<FileText className="w-6 h-6" />} title="Aucun devis reçu" />}</TabsContent>
        <TabsContent value="sent" className="space-y-3 mt-4">{sent.length ? sent.map((q) => card(q, false)) : <EmptyState icon={<FileText className="w-6 h-6" />} title="Aucun devis envoyé">Dans une conversation, cliquez sur « Envoyer un devis ».</EmptyState>}</TabsContent>
      </Tabs>
    </PageShell>
  );
}
