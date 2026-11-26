// Pickup point partner desk (#26): parcels waiting at my point, arrival, hand-over with the buyer's code.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Package } from "lucide-react";

type O = { id: string; status: string; delivery_status: string | null; payment_mode: string; total_price: number; created_at: string; pickup_point_id: string; product: { title: string } | null };

export default function PickupPartner() {
  const { user } = useAuth();
  const [points, setPoints] = useState<{ id: string; name: string; city: string }[]>([]);
  const [orders, setOrders] = useState<O[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("pickup_points").select("id, name, city").eq("partner_id", user.id);
    setPoints(p ?? []);
    if (p?.length) {
      const { data } = await supabase.from("orders").select("id, status, delivery_status, payment_mode, total_price, created_at, pickup_point_id, product:products(title)")
        .in("pickup_point_id", p.map((x) => x.id)).not("status", "in", "(completed,cancelled)").order("created_at", { ascending: false });
      setOrders((data ?? []) as unknown as O[]);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);
  const arrived = async (o: O) => { const { error } = await supabase.rpc("mark_parcel_at_pickup", { p_order_id: o.id }); if (error) return toast.error(errMsg(error)); toast.success("Client prévenu"); load(); };
  const handover = async (o: O) => {
    const { data, error } = await supabase.rpc("confirm_handover", { p_order_id: o.id, p_code: codes[o.id] ?? "" });
    const r = data as { success: boolean; error?: string } | null;
    if (error || !r?.success) return toast.error(error?.message ?? r?.error ?? "Code incorrect");
    toast.success("Colis remis"); load();
  };
  if (!points.length) return <PageShell title="Point relais"><EmptyState icon={<MapPin className="w-6 h-6" />} title="Vous n'êtes partenaire d'aucun point relais">Contactez MIYASHI pour ouvrir un point relais dans votre commerce.</EmptyState></PageShell>;
  return (
    <PageShell title="Point relais" description={points.map((p) => `${p.name} (${p.city})`).join(" · ")}>
      {!orders.length ? <EmptyState icon={<Package className="w-6 h-6" />} title="Aucun colis en attente" /> : (
        <div className="space-y-3">{orders.map((o) => (
          <Card key={o.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1"><p className="font-medium">{o.product?.title ?? "Colis"} <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span></p>
              <p className="text-sm text-muted-foreground">{o.payment_mode === "cod" ? `À encaisser : ${fcfa(o.total_price)}` : "Déjà payé"}</p></div>
            <Badge variant="outline">{o.delivery_status === "at_pickup_point" ? "Au point relais" : "En route"}</Badge>
            {o.delivery_status !== "at_pickup_point" ? <Button size="sm" variant="outline" onClick={() => arrived(o)}>Colis arrivé</Button> : (
              <div className="flex gap-2"><Input inputMode="numeric" maxLength={6} placeholder="Code client" className="w-32" value={codes[o.id] ?? ""} onChange={(e) => setCodes({ ...codes, [o.id]: e.target.value.replace(/\D/g, "") })} aria-label="Code client" />
                <Button size="sm" onClick={() => handover(o)} disabled={(codes[o.id] ?? "").length !== 6}>Remettre</Button></div>
            )}
          </CardContent></Card>
        ))}</div>
      )}
    </PageShell>
  );
}
