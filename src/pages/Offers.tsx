// Price offers sent and received (#9).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { useSpaces } from "@/hooks/useSpaces";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";

type Offer = {
  id: string; product_id: string; buyer_id: string; seller_id: string; quantity: number; list_price: number; offered_price: number;
  counter_price: number | null; agreed_price: number | null; message: string | null; status: string; expires_at: string; created_at: string;
  product: { title: string; images: string[] | null } | null; variant: { label: string } | null;
};
const LABEL: Record<string, string> = { pending: "En attente", countered: "Contre-offre", accepted: "Acceptée", rejected: "Refusée", expired: "Expirée", used: "Payée", cancelled: "Annulée" };

export default function Offers() {
  const { user } = useAuth();
  const sp = useSpaces();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [counter, setCounter] = useState<Record<string, string>>({});
  const load = () => user && supabase.from("price_offers").select("*, product:products(title, images), variant:product_variants(label)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100)
    .then(({ data }) => setOffers((data ?? []) as unknown as Offer[]));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const act = async (o: Offer, action: string) => {
    const { error } = await supabase.rpc("respond_offer", { p_offer_id: o.id, p_action: action, p_counter_price: action === "counter" ? Number(counter[o.id]) : undefined });
    if (error) return toast.error(errMsg(error));
    toast.success("Réponse envoyée");
    load();
  };
  const mine = offers.filter((o) => o.buyer_id === user?.id);
  const received = offers.filter((o) => o.buyer_id !== user?.id);
  const live = (o: Offer) => new Date(o.expires_at) > new Date();

  const row = (o: Offer, asSeller: boolean) => (
    <Card key={o.id}><CardContent className="p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">{o.product?.images?.[0] && <img src={o.product.images[0]} alt="" className="w-full h-full object-cover" />}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap"><Link to={`/product/${o.product_id}`} className="font-semibold hover:text-primary">{o.product?.title}</Link><Badge variant="outline">{LABEL[o.status] ?? o.status}</Badge></div>
        <p className="text-sm text-muted-foreground">{o.variant?.label ? `${o.variant.label} · ` : ""}{o.quantity} pièce(s) · prix affiché {fcfa(o.list_price)}</p>
        <p className="text-sm">Offre : <strong>{fcfa(o.offered_price)}</strong>{o.counter_price ? <> · contre-offre : <strong>{fcfa(o.counter_price)}</strong></> : null}{o.agreed_price ? <> · accord : <strong className="text-accent">{fcfa(o.agreed_price)}</strong></> : null}</p>
        {o.message && <p className="text-sm italic text-muted-foreground">« {o.message} »</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          {asSeller && o.status === "pending" && live(o) && (<>
            <Button size="sm" onClick={() => act(o, "accept")}>Accepter</Button>
            <Input type="number" className="w-32 h-9" placeholder="Contre-offre" value={counter[o.id] ?? ""} onChange={(e) => setCounter({ ...counter, [o.id]: e.target.value })} />
            <Button size="sm" variant="outline" disabled={!counter[o.id]} onClick={() => act(o, "counter")}>Proposer</Button>
            <Button size="sm" variant="ghost" onClick={() => act(o, "reject")}>Refuser</Button>
          </>)}
          {!asSeller && o.status === "countered" && live(o) && (<>
            <Button size="sm" onClick={() => act(o, "accept")}>Accepter {fcfa(o.counter_price)}</Button>
            <Button size="sm" variant="ghost" onClick={() => act(o, "cancel")}>Refuser</Button>
          </>)}
          {!asSeller && o.status === "pending" && <Button size="sm" variant="ghost" onClick={() => act(o, "cancel")}>Retirer mon offre</Button>}
          {!asSeller && o.status === "accepted" && live(o) && <Button size="sm" onClick={() => navigate(`/checkout?offer=${o.id}`)}>Payer {fcfa((o.agreed_price ?? 0) * o.quantity)}</Button>}
          {["pending", "countered", "accepted"].includes(o.status) && live(o) && <span className="text-xs text-muted-foreground self-center">Expire le {new Date(o.expires_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>}
        </div>
      </div>
    </CardContent></Card>
  );

  const seller = sp.can("sell") || received.length > 0;
  return (
    <PageShell title="Offres et marchandage" description="Proposez votre prix, le vendeur accepte, refuse ou fait une contre-offre.">
      <Tabs defaultValue={seller && received.some((o) => o.status === "pending") ? "received" : "mine"}>
        <TabsList><TabsTrigger value="mine">Mes offres ({mine.length})</TabsTrigger>{seller && <TabsTrigger value="received">Reçues ({received.length})</TabsTrigger>}</TabsList>
        <TabsContent value="mine" className="space-y-3 mt-4">{mine.length ? mine.map((o) => row(o, false)) : <EmptyState icon={<HandCoins className="w-6 h-6" />} title="Aucune offre envoyée">Sur une fiche produit, cliquez sur « Faire une offre ».</EmptyState>}</TabsContent>
        <TabsContent value="received" className="space-y-3 mt-4">{received.length ? received.map((o) => row(o, true)) : <EmptyState icon={<HandCoins className="w-6 h-6" />} title="Aucune offre reçue" />}</TabsContent>
      </Tabs>
    </PageShell>
  );
}
