// Printable invoice (#6). "Télécharger en PDF" uses the browser's print-to-PDF.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

type Inv = {
  invoice: { number: string; issued_at: string; amount: number; vat_rate: number; vat_amount: number };
  order: { id: string; quantity: number; unit_price: number | null; total_price: number; payment_mode: string; variant_label: string | null; shipping_address: string | null; created_at: string };
  item: string;
  buyer: { name: string | null; phone: string | null; location: string | null };
  seller: { name: string | null; phone: string | null; location: string | null; vat_number: string | null; country: string | null };
};

export default function Invoice() {
  const { orderId } = useParams();
  const [inv, setInv] = useState<Inv | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.rpc("get_invoice", { p_order_id: orderId! }).then(({ data, error }) => (error ? setError(error.message) : setInv(data as Inv)));
  }, [orderId]);

  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"><p>{error}</p><Button asChild variant="outline"><Link to="/dashboard">Retour</Link></Button></div>;
  if (!inv) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const o = inv.order, i = inv.invoice;
  const ht = i.amount - i.vat_amount;
  return (
    <div className="min-h-screen bg-muted/40 print:bg-white py-8 px-4">
      <div className="no-print max-w-3xl mx-auto mb-4 flex justify-between">
        <Button asChild variant="ghost"><Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link></Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Télécharger en PDF</Button>
      </div>
      <article className="max-w-3xl mx-auto bg-white text-neutral-900 rounded-xl shadow-sm print:shadow-none p-8 sm:p-12 text-sm">
        <header className="flex justify-between items-start border-b border-neutral-200 pb-6 mb-6">
          <div><p className="text-2xl font-black tracking-wide">MIYASHI</p><p className="text-neutral-500">Marketplace d'Afrique de l'Ouest</p></div>
          <div className="text-right"><p className="text-xl font-bold">Facture</p><p>N° {i.number}</p><p className="text-neutral-500">{new Date(i.issued_at).toLocaleDateString("fr-FR")}</p></div>
        </header>
        <section className="grid grid-cols-2 gap-6 mb-8">
          <div><p className="text-xs uppercase text-neutral-500 mb-1">Vendeur</p><p className="font-semibold">{inv.seller.name ?? "—"}</p><p>{inv.seller.location}</p><p>{inv.seller.phone}</p>{inv.seller.vat_number && <p>N° fiscal : {inv.seller.vat_number}</p>}</div>
          <div><p className="text-xs uppercase text-neutral-500 mb-1">Client</p><p className="font-semibold">{inv.buyer.name ?? "—"}</p><p>{o.shipping_address || inv.buyer.location}</p><p>{inv.buyer.phone}</p></div>
        </section>
        <table className="w-full mb-6">
          <thead><tr className="border-b border-neutral-300 text-left"><th className="py-2">Désignation</th><th className="py-2 text-right">Qté</th><th className="py-2 text-right">Prix unitaire</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody><tr className="border-b border-neutral-100"><td className="py-3">{inv.item}{o.variant_label ? ` — ${o.variant_label}` : ""}<span className="block text-xs text-neutral-500">Commande #{o.id.slice(0, 8)} du {new Date(o.created_at).toLocaleDateString("fr-FR")}</span></td>
            <td className="py-3 text-right">{o.quantity}</td><td className="py-3 text-right">{fcfa(o.unit_price ?? o.total_price / o.quantity)}</td><td className="py-3 text-right">{fcfa(o.total_price)}</td></tr></tbody>
        </table>
        <div className="ml-auto w-64 space-y-1">
          {i.vat_rate > 0 ? (<>
            <div className="flex justify-between"><span>Total HT</span><span>{fcfa(ht)}</span></div>
            <div className="flex justify-between"><span>TVA {i.vat_rate} %</span><span>{fcfa(i.vat_amount)}</span></div>
          </>) : <p className="text-xs text-neutral-500">TVA non applicable (vendeur non assujetti).</p>}
          <div className="flex justify-between font-bold text-base border-t border-neutral-300 pt-2"><span>Total TTC</span><span>{fcfa(i.amount)}</span></div>
          <p className="text-xs text-neutral-500 pt-2">Payé {o.payment_mode === "cod" ? "à la livraison" : "via MIYASHI (paiement sécurisé)"}.</p>
        </div>
        <footer className="mt-12 pt-4 border-t border-neutral-200 text-xs text-neutral-500">Facture émise via MIYASHI pour le compte du vendeur. Document généré électroniquement.</footer>
      </article>
    </div>
  );
}
