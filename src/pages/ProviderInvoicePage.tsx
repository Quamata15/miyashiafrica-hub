// Printable provider invoice. Readable by the provider and, once sent, by the client.
// "Télécharger en PDF" uses the browser's print-to-PDF.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandMark";
import { fcfa } from "@/lib/prefs";
import SEOHead from "@/components/SEOHead";

type Item = { label: string; qty: number; unit_price: number };
type Inv = {
  id: string; number: string; status: string; provider_id: string; client_name: string; client_email: string | null; client_phone: string | null; client_address: string | null;
  items: Item[]; subtotal: number; discount: number; vat_rate: number; vat_amount: number; total: number; issued_at: string; due_date: string | null; paid_at: string | null; payment_method: string | null; notes: string | null;
};
type Seller = { full_name: string | null; phone: string | null; location: string | null };

const STATUS: Record<string, string> = { draft: "Brouillon", sent: "À payer", paid: "Payée", cancelled: "Annulée" };

export default function ProviderInvoicePage() {
  const { id } = useParams();
  const [inv, setInv] = useState<Inv | null | undefined>(undefined);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [shop, setShop] = useState<{ name: string; vat_number: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("provider_invoices").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      setInv((data as unknown as Inv) ?? null);
      if (!data) return;
      const [{ data: p }, { data: s }, { data: pp }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, location").eq("user_id", data.provider_id).maybeSingle(),
        supabase.from("shops").select("name, vat_number").eq("owner_id", data.provider_id).maybeSingle(),
        supabase.from("provider_profiles").select("tax_number").eq("user_id", data.provider_id).maybeSingle(),
      ]);
      setSeller(p); setShop(s || pp?.tax_number ? { name: s?.name ?? "", vat_number: s?.vat_number || pp?.tax_number || null } : null);
    });
  }, [id]);

  if (inv === undefined) return <p className="p-10 text-center text-muted-foreground">Chargement…</p>;
  if (inv === null) return <div className="p-10 text-center"><p className="font-semibold">Facture introuvable</p><Link to="/dashboard" className="text-primary underline">Retour</Link></div>;

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white py-8 px-4">
      <SEOHead title={`Facture ${inv.number}`} description="Facture" noindex />
      <div className="no-print max-w-3xl mx-auto mb-4 flex justify-between gap-2">
        <Button variant="outline" asChild><Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Tableau de bord</Link></Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Télécharger en PDF</Button>
      </div>
      <article className="relative max-w-3xl mx-auto bg-white text-neutral-900 rounded-xl shadow-sm print:shadow-none p-8 sm:p-12 text-sm overflow-hidden">
        {inv.status === "cancelled" && <p className="absolute top-10 right-[-60px] rotate-45 bg-red-600 text-white px-20 py-1 font-bold tracking-widest">ANNULÉE</p>}
        {inv.status === "paid" && <p className="absolute top-10 right-[-60px] rotate-45 bg-emerald-600 text-white px-20 py-1 font-bold tracking-widest">PAYÉE</p>}
        <header className="flex flex-col sm:flex-row justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-lg font-bold">{shop?.name || seller?.full_name || "Prestataire"}</p>
            {seller?.full_name && shop?.name && <p>{seller.full_name}</p>}
            {seller?.location && <p>{seller.location}</p>}
            {seller?.phone && <p>Tél. {seller.phone}</p>}
            {shop?.vat_number && <p>N° fiscal : {shop.vat_number}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-extrabold tracking-tight">FACTURE</p>
            <p className="font-mono">{inv.number}</p>
            <p>Émise le {new Date(inv.issued_at).toLocaleDateString("fr-FR")}</p>
            {inv.due_date && <p>Échéance : {new Date(inv.due_date).toLocaleDateString("fr-FR")}</p>}
            <p className="mt-1 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold">{STATUS[inv.status] ?? inv.status}</p>
          </div>
        </header>
        <section className="py-6">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Facturé à</p>
          <p className="font-semibold">{inv.client_name}</p>
          {inv.client_address && <p>{inv.client_address}</p>}
          {inv.client_phone && <p>{inv.client_phone}</p>}
          {inv.client_email && <p>{inv.client_email}</p>}
        </section>
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500"><th className="py-2">Désignation</th><th className="py-2 text-right">Qté</th><th className="py-2 text-right">Prix unitaire</th><th className="py-2 text-right">Montant</th></tr></thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} className="border-b border-neutral-100"><td className="py-2 pr-2">{it.label}</td><td className="py-2 text-right">{it.qty}</td><td className="py-2 text-right">{fcfa(it.unit_price)}</td><td className="py-2 text-right">{fcfa(it.qty * it.unit_price)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-full sm:w-72 space-y-1">
          <p className="flex justify-between"><span>Sous-total</span><span>{fcfa(inv.subtotal)}</span></p>
          {inv.discount > 0 && <p className="flex justify-between"><span>Remise</span><span>− {fcfa(inv.discount)}</span></p>}
          <p className="flex justify-between"><span>TVA ({inv.vat_rate} %)</span><span>{fcfa(inv.vat_amount)}</span></p>
          <p className="flex justify-between border-t border-neutral-300 pt-2 text-base font-bold"><span>Total</span><span>{fcfa(inv.total)}</span></p>
          {inv.paid_at && <p className="text-xs text-emerald-700">Payée le {new Date(inv.paid_at).toLocaleDateString("fr-FR")}{inv.payment_method ? ` (${inv.payment_method})` : ""}</p>}
        </div>
        {inv.notes && <p className="mt-8 text-neutral-600 whitespace-pre-wrap">{inv.notes}</p>}
        <footer className="mt-10 pt-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <span>Facture émise via MIYASHI · montants en francs CFA (XOF)</span>
          <BrandLogo className="h-6" />
        </footer>
      </article>
    </div>
  );
}
