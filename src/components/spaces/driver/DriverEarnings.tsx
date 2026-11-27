// Driver space header: availability, earnings, proof rate and what is missing to work.
import { Link } from "react-router-dom";
import { Bike, Wallet, MapPin, Star, Camera, ShieldAlert, Route } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GuideProgressCard } from "../SpaceGuide";
import { Section, Stat, StatGrid, attempt, fcfa, useRpc } from "../kit";

type Stats = { available: boolean | null; zone: string | null; rating: number | null; deliveries_total: number; active: number; open_requests: number; earned_period: number; earned_today: number; km_period: number; proof_rate: number | null; contract_signed: boolean; kyc: string | null; daily: { day: string; earned: number; count: number }[] };

export default function DriverEarnings({ onTab }: { onTab: (tab: string) => void }) {
  const { user } = useAuth();
  const { data: s, loading, reload, setData } = useRpc<Stats>("get_driver_stats", { p_days: 30 });

  const toggle = async (next: boolean) => {
    if (!user || !s) return;
    setData({ ...s, available: next });
    const ok = await attempt(() => supabase.from("driver_profiles").update({ is_available: next }).eq("user_id", user.id), next ? "Vous êtes disponible : les demandes de votre zone arrivent." : "Vous êtes en pause.");
    if (!ok) reload();
  };

  const missing = s && (s.available === null || !s.contract_signed || s.kyc !== "approved");
  return (
    <div className="space-y-4">
      <GuideProgressCard space="livreur" onTab={onTab} />
      {missing && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
          <p className="flex-1 text-sm">
            {s.available === null ? "Créez votre profil de livreur pour recevoir des courses." : !s.contract_signed ? "Signez la charte du livreur pour recevoir votre badge." : "Votre identité doit être vérifiée avant votre premier retrait."}
          </p>
          <Button size="sm" asChild><Link to={s.available === null || !s.contract_signed ? "/driver-registration" : "/profile?tab=kyc"}>Compléter</Link></Button>
        </div>
      )}

      {s && s.available !== null && (
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${s.available ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-foreground/10 bg-card/80"}`}>
          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.available ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}><Bike className="w-6 h-6" /></span>
          <div className="flex-1">
            <p className="font-semibold">{s.available ? "Disponible" : "En pause"}{s.zone ? ` · ${s.zone}` : ""}</p>
            <p className="text-sm text-muted-foreground">{s.open_requests} demande(s) en attente{s.active ? ` · ${s.active} course(s) en cours` : ""}</p>
          </div>
          <Switch checked={!!s.available} onCheckedChange={toggle} aria-label="Disponibilité" />
        </div>
      )}

      <StatGrid loading={loading}>
        <Stat label="Gagné aujourd'hui" value={fcfa(s?.earned_today ?? 0)} icon={Wallet} />
        <Stat label="30 derniers jours" value={fcfa(s?.earned_period ?? 0)} hint={`${Math.round(Number(s?.km_period ?? 0))} km parcourus`} icon={Route} tone="accent" />
        <Stat label="Note moyenne" value={s?.rating ? `${Number(s.rating).toFixed(1)}/5` : "—"} hint={`${s?.deliveries_total ?? 0} livraisons`} icon={Star} tone="warning" />
        <Stat label="Remises prouvées" value={s?.proof_rate != null ? `${s.proof_rate} %` : "—"} hint="Photo ou code client" icon={Camera} tone={(s?.proof_rate ?? 100) < 80 ? "danger" : "primary"} />
      </StatGrid>

      {s && s.daily.some((d) => d.earned > 0) && (
        <Section title="Vos gains" description="Par jour, sur 30 jours (après commission).">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.daily.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) }))}>
                <defs><linearGradient id="earn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => fcfa(v)} />
                <Area type="monotone" dataKey="earned" name="Gains" stroke="hsl(var(--primary))" fill="url(#earn)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Les courses ci-dessous viennent de votre zone. Vérifiez toujours le colis avant de partir.</p>
    </div>
  );
}
