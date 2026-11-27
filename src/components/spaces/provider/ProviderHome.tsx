// Provider space overview: revenue, money in escrow, quotes, bookings, unpaid invoices.
import { Link } from "react-router-dom";
import { Wallet, ShieldCheck, FileText, CalendarClock, Receipt, Star, Briefcase, Plus, Layers, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { GuideProgressCard } from "../SpaceGuide";
import { Section, Stat, StatGrid, dateFr, fcfa, useRpc } from "../kit";

type Stats = { revenue: number; orders_active: number; escrow_held: number; quotes_sent: number; quotes_accepted: number; quotes_pending: number; bookings_upcoming: number; next_booking: string | null;
  invoices_unpaid: number; invoices_overdue: number; rating: number | null; reviews: number; services: number; daily: { day: string; revenue: number }[] };

export default function ProviderHome({ onTab }: { onTab: (tab: string) => void }) {
  const { data: s, loading } = useRpc<Stats>("get_provider_stats", { p_days: 30 });
  const conv = s && s.quotes_sent ? Math.round((s.quotes_accepted / s.quotes_sent) * 100) : null;
  return (
    <div className="space-y-6">
      <GuideProgressCard space="prestataire" onTab={onTab} />
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/create?type=service"><Plus className="w-4 h-4 mr-1" />Nouveau service</Link></Button>
        <Button variant="outline" onClick={() => onTab("formules")}><Layers className="w-4 h-4 mr-1" />Formules</Button>
        <Button variant="outline" asChild><Link to="/quotes"><FileText className="w-4 h-4 mr-1" />Devis</Link></Button>
        <Button variant="outline" onClick={() => onTab("factures")}><Receipt className="w-4 h-4 mr-1" />Factures</Button>
        <Button variant="outline" asChild><Link to="/bookings"><CalendarClock className="w-4 h-4 mr-1" />Agenda</Link></Button>
        <Button variant="outline" onClick={() => onTab("clients")}><Users className="w-4 h-4 mr-1" />Clients</Button>
      </div>
      <StatGrid loading={loading}>
        <Stat label="Chiffre d'affaires (30 j)" value={fcfa(s?.revenue ?? 0)} icon={Wallet} />
        <Stat label="En séquestre" value={fcfa(s?.escrow_held ?? 0)} hint="Versé à la fin des prestations" icon={ShieldCheck} tone="accent" />
        <Stat label="Prestations en cours" value={s?.orders_active ?? 0} icon={Briefcase} tone="warning" onClick={() => onTab("etapes")} />
        <Stat label="Note" value={s?.rating ? `${s.rating}/5` : "—"} hint={`${s?.reviews ?? 0} avis`} icon={Star} tone="warning" />
        <Stat label="Devis en attente" value={s?.quotes_pending ?? 0} hint={conv != null ? `${conv} % acceptés sur 30 j` : undefined} icon={FileText} />
        <Stat label="Rendez-vous à venir" value={s?.bookings_upcoming ?? 0} hint={s?.next_booking ? `Prochain : ${dateFr(s.next_booking, true)}` : undefined} icon={CalendarClock} tone="accent" />
        <Stat label="Factures à encaisser" value={fcfa(s?.invoices_unpaid ?? 0)} hint={s?.invoices_overdue ? `${s.invoices_overdue} en retard` : undefined} icon={Receipt} tone={s?.invoices_overdue ? "danger" : "muted"} onClick={() => onTab("factures")} />
        <Stat label="Services actifs" value={s?.services ?? 0} icon={Layers} onClick={() => onTab("services")} />
      </StatGrid>
      {s && s.daily.some((d) => d.revenue > 0) && (
        <Section title="Chiffre d'affaires" description="Prestations payées par jour, sur 30 jours.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.daily.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) }))}>
                <defs><linearGradient id="prov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => fcfa(v)} />
                <Area type="monotone" dataKey="revenue" name="Chiffre d'affaires" stroke="hsl(var(--primary))" fill="url(#prov)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </div>
  );
}
