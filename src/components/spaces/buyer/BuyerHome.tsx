// Buyer space overview: what is protected, what is on its way, what needs an action.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Package, Truck, Star, Wallet, Heart, Tag, PiggyBank, Bell, MapPin, AlertTriangle, FileText, CalendarClock, CheckCircle2, MessageSquare, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GuideProgressCard } from "../SpaceGuide";
import { Empty, Section, Stat, StatGrid, attempt, dateFr, fcfa, openConversation, useRpc } from "../kit";

type Summary = { orders_active: number; escrow_protected: number; to_confirm: number; to_review: number; wallet: number; favorites: number; offers_open: number; disputes_open: number; quotes_received: number; invoices: number; spent: number };
type Order = { id: string; status: string; payment_mode: string | null; payment_status: string; total_price: number; created_at: string; seller_id: string; fulfillment_method: string | null; product: { title: string; images: string[] | null } | null; service: { title: string } | null };

const STEPS = ["Payée", "En préparation", "En route", "Reçue"];
const stepOf = (s: string) => (["delivered", "completed"].includes(s) ? 3 : ["shipped", "in_transit"].includes(s) ? 2 : ["confirmed", "processing", "accepted"].includes(s) ? 1 : 0);

export default function BuyerHome({ onTab }: { onTab: (tab: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: s, loading, reload } = useRpc<Summary>("get_buyer_summary");
  const [orders, setOrders] = useState<Order[] | null>(null);

  const loadOrders = () => user && supabase.from("orders")
    .select("id, status, payment_mode, payment_status, total_price, created_at, seller_id, fulfillment_method, product:products(title, images), service:services(title)")
    .eq("buyer_id", user.id).not("status", "in", "(completed,cancelled,refunded)").order("created_at", { ascending: false }).limit(8)
    .then(({ data }) => setOrders((data ?? []) as unknown as Order[]));
  useEffect(() => { loadOrders(); }, [user?.id]);

  const confirm = async (id: string) => {
    if (await attempt(() => supabase.rpc("confirm_order_reception", { p_order_id: id }), "Réception confirmée : le vendeur est payé. Merci !")) { loadOrders(); reload(); }
  };

  const tools = [
    { to: "/favorites", icon: Heart, label: "Favoris", n: s?.favorites },
    { to: "/offers", icon: Tag, label: "Mes offres de prix", n: s?.offers_open },
    { to: "/savings", icon: PiggyBank, label: "Épargne achat" },
    { to: "/alerts", icon: Bell, label: "Alertes prix" },
    { to: "/addresses", icon: MapPin, label: "Adresses" },
    { to: "/quotes", icon: FileText, label: "Devis reçus", n: s?.quotes_received },
    { to: "/bookings", icon: CalendarClock, label: "Rendez-vous" },
    { to: "/disputes", icon: AlertTriangle, label: "Litiges", n: s?.disputes_open },
  ];

  return (
    <div className="space-y-6">
      <GuideProgressCard space="acheteur" onTab={onTab} />

      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6 text-emerald-400" /></span>
        <div className="flex-1">
          <p className="font-semibold">{fcfa(s?.escrow_protected ?? 0)} protégés en séquestre</p>
          <p className="text-sm text-muted-foreground">Le vendeur n'est payé qu'après votre confirmation de réception (ou 7 jours après la remise sans réclamation). Un souci ? Ouvrez un litige : l'argent reste bloqué.</p>
        </div>
        <Button variant="outline" size="sm" asChild><Link to="/help">Comment ça marche</Link></Button>
      </div>

      <StatGrid loading={loading}>
        <Stat label="Commandes en cours" value={s?.orders_active ?? 0} icon={Truck} onClick={() => onTab("commandes")} />
        <Stat label="À confirmer" value={s?.to_confirm ?? 0} icon={CheckCircle2} tone={s?.to_confirm ? "warning" : "muted"} hint="Colis reçu ? Confirmez." />
        <Stat label="Avis à laisser" value={s?.to_review ?? 0} icon={Star} tone="accent" onClick={() => onTab("commandes")} />
        <Stat label="Portefeuille" value={fcfa(s?.wallet ?? 0)} icon={Wallet} onClick={() => navigate("/wallet")} />
      </StatGrid>

      <Section title="Vos commandes en cours" action={<Button size="sm" variant="ghost" onClick={() => onTab("commandes")}>Tout voir</Button>}>
        {orders === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : orders.length === 0 ? (
          <Empty icon={ShoppingBag} title="Aucune commande en cours" text="Parcourez le marché : votre paiement sera protégé jusqu'à la réception." action={<Button asChild><Link to="/marketplace">Voir le marché</Link></Button>} />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const step = stepOf(o.status);
              const title = o.product?.title ?? o.service?.title ?? "Commande";
              return (
                <li key={o.id} className="rounded-xl border border-foreground/10 p-3 md:p-4">
                  <div className="flex items-start gap-3">
                    {o.product?.images?.[0] ? <img src={o.product.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" loading="lazy" /> : <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{title}</p>
                      <p className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {dateFr(o.created_at)} · {fcfa(o.total_price)}{o.payment_mode === "cod" ? " · à payer à la livraison" : ""}</p>
                    </div>
                    {o.payment_mode !== "cod" && o.payment_status === "paid" && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 shrink-0"><ShieldCheck className="w-3 h-3 mr-1" />Protégé</Badge>}
                  </div>
                  <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Avancement">
                    {STEPS.map((label, i) => (
                      <li key={label} className="text-center">
                        <span className={`block h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                        <span className={`mt-1 block text-[11px] ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["delivered", "shipped"].includes(o.status) && o.payment_mode !== "cod" && <Button size="sm" onClick={() => confirm(o.id)}><CheckCircle2 className="w-4 h-4 mr-1" />J'ai reçu ma commande</Button>}
                    {user && <Button size="sm" variant="outline" onClick={() => openConversation(user.id, o.seller_id, navigate)}><MessageSquare className="w-4 h-4 mr-1" />Contacter le vendeur</Button>}
                    <Button size="sm" variant="ghost" asChild><Link to="/disputes">Signaler un problème</Link></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Vos outils d'achat">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {tools.map((t) => (
            <Link key={t.to} to={t.to} className="flex items-center gap-2 rounded-xl border border-foreground/10 p-3 text-sm hover:border-primary/40 transition-colors">
              <t.icon className="w-4 h-4 text-primary shrink-0" /><span className="flex-1 truncate">{t.label}</span>
              {!!t.n && <Badge variant="secondary" className="h-5">{t.n}</Badge>}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Total de vos achats payés : {fcfa(s?.spent ?? 0)}</p>
      </Section>
    </div>
  );
}
