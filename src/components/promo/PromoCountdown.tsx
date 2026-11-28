// Promotion on a product page: running (price cut + time left) or announced (starts in…).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Timer } from "lucide-react";

export type Promo = { id: string; name: string; discount_type: string | null; discount_value: number | null; min_quantity: number | null; start_date: string; end_date: string };

export function applyPromo(price: number, p: Promo | null, qty = 1) {
  if (!p || new Date(p.start_date) > new Date() || (p.min_quantity ?? 1) > qty) return price;
  const v = Number(p.discount_value) || 0;
  return Math.max(0, Math.round(p.discount_type === "percentage" ? price * (1 - v / 100) : price - v));
}

export function useProductPromo(productId?: string) {
  const [promo, setPromo] = useState<Promo | null>(null);
  useEffect(() => {
    if (!productId) return;
    supabase.rpc("product_promotion", { p_product_id: productId, p_quantity: 1, p_upcoming: true })
      .then(({ data }) => setPromo(((data as Promo[] | null) ?? [])[0] ?? null));
  }, [productId]);
  return promo;
}

const left = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return d > 0 ? `${d} j ${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function PromoCountdown({ promo }: { promo: Promo | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!promo) return null;
  const start = new Date(promo.start_date).getTime(), end = new Date(promo.end_date).getTime();
  if (end <= now) return null;
  const running = start <= now;
  const off = promo.discount_type === "percentage" ? `-${promo.discount_value} %` : `-${Number(promo.discount_value).toLocaleString("fr-FR")} F`;
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-sm ${running ? "border-primary/40 bg-primary/10" : "border-dashed"}`} aria-live="off">
      <Timer className="h-4 w-4 text-primary" aria-hidden />
      <span className="font-semibold">{promo.name} {off}</span>
      {(promo.min_quantity ?? 1) > 1 && <span className="text-xs text-muted-foreground">dès {promo.min_quantity} pièces</span>}
      <span className="ml-auto tabular-nums text-xs sm:text-sm">{running ? "Se termine dans " : "Commence dans "}<strong>{left((running ? end : start) - now)}</strong></span>
    </div>
  );
}
