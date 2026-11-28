// Deeper seller figures: what is viewed but not bought, when people order, average basket,
// and the accounting export (amounts excl. tax, tax, commission, net).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";

type Insights = { views: number; orders: number; avg_basket: number; conversion: number; orders_by_hour: number[]; orders_by_weekday: number[];
  viewed_not_bought: { id: string; title: string; price: number; views: number; orders: number }[] };
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-24" role="img" aria-label={labels.map((l, i) => `${l} : ${values[i]}`).join(", ")}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t bg-primary/80" style={{ height: `${(v / max) * 80}px`, minHeight: v ? 3 : 1, opacity: v ? 1 : 0.25 }} />
          <span className="text-[9px] text-muted-foreground truncate">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function SellerInsights({ sellerId, days }: { sellerId: string; days: number }) {
  const [d, setD] = useState<Insights | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  useEffect(() => { supabase.rpc("seller_insights", { p_seller: sellerId, p_days: days }).then(({ data }) => setD(data as Insights)); }, [sellerId, days]);

  const exportCsv = async () => {
    const { data, error } = await supabase.rpc("accounting_export", { p_from: from, p_to: to, p_seller: sellerId });
    if (error) return toast.error(errMsg(error));
    const rows = (data ?? []) as Record<string, unknown>[];
    const head = ["Date", "Réf", "Libellé", "Paiement", "TTC", "Taux TVA", "HT", "TVA", "Commission MIYASHI", "Net", "Statut"];
    const keys = ["order_date", "order_ref", "label", "payment", "total_ttc", "vat_rate", "total_ht", "vat", "commission", "net", "status"];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [head.map(cell).join(";"), ...rows.map((r) => keys.map((k) => cell(r[k])).join(";"))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `miyashi-comptabilite-${from}-${to}.csv`;
    a.click();
    toast.success(`${rows.length} ligne(s) exportée(s)`);
  };

  if (!d) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Panier moyen et conversion</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Panier moyen</p><p className="text-xl font-bold">{fcfa(d.avg_basket)}</p></div>
        <div><p className="text-xs text-muted-foreground">Vues → commandes</p><p className="text-xl font-bold">{d.conversion} %</p></div>
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" />Vus mais peu achetés</CardTitle></CardHeader><CardContent>
        {!d.viewed_not_bought.length ? <p className="text-sm text-muted-foreground">Rien à signaler sur la période.</p> : (
          <ul className="space-y-1.5 text-sm">{d.viewed_not_bought.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2"><Link to={`/product/${p.id}`} className="truncate hover:text-primary">{p.title}</Link>
              <span className="shrink-0 text-xs text-muted-foreground">{p.views} vues · {p.orders} cmd</span></li>
          ))}</ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Pistes : meilleures photos, prix plus juste, une promotion ou un boost.</p>
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Heures des commandes</CardTitle></CardHeader><CardContent>
        <Bars values={d.orders_by_hour} labels={d.orders_by_hour.map((_, h) => (h % 3 === 0 ? `${h}h` : ""))} />
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Jours des commandes</CardTitle></CardHeader><CardContent>
        <Bars values={d.orders_by_weekday} labels={DAYS} />
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base">Export comptable</CardTitle></CardHeader><CardContent className="flex flex-wrap items-end gap-3">
        <div><Label htmlFor="ac-from">Du</Label><Input id="ac-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="ac-to">Au</Label><Input id="ac-to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></div>
        <Button onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" />Télécharger (CSV, Excel)</Button>
        <p className="w-full text-xs text-muted-foreground">HT, TVA, TTC, commission et net par vente. La TVA s'applique si votre numéro fiscal est renseigné dans « Ma boutique » (taux standard du pays : vérifiez avec votre comptable).</p>
      </CardContent></Card>
    </div>
  );
}
