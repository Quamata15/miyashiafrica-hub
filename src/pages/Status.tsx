// Public status page (#49).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type S = { component: string; ok: boolean; last_checked: string; uptime_24h: number | null; uptime_7d: number | null; latency_ms: number | null };

export default function Status() {
  const [list, setList] = useState<S[] | null>(null);
  useEffect(() => {
    const load = () => supabase.rpc("get_status_summary").then(({ data }) => setList((data ?? []) as S[]));
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, []);
  const allOk = list?.every((s) => s.ok);
  return (
    <PageShell title="État du service" description="Vérifié automatiquement toutes les 10 minutes.">
      {!list ? <Loader2 className="w-6 h-6 animate-spin" /> : (<>
        <Card className={`mb-6 ${allOk ? "border-accent/40" : "border-destructive/40"}`}><CardContent className="p-6 flex items-center gap-4">
          {allOk ? <CheckCircle2 className="w-10 h-10 text-accent" /> : <XCircle className="w-10 h-10 text-destructive" />}
          <div><p className="text-xl font-semibold">{list.length ? (allOk ? "Tous les services fonctionnent" : "Incident en cours") : "Pas encore de mesure"}</p>
            {list[0]?.last_checked && <p className="text-sm text-muted-foreground">Dernière vérification : {new Date(list[0].last_checked).toLocaleString("fr-FR")}</p>}</div>
        </CardContent></Card>
        <div className="space-y-2">{list.map((s) => (
          <div key={s.component} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-4">
            <span className={`w-3 h-3 rounded-full ${s.ok ? "bg-accent" : "bg-destructive"}`} aria-hidden />
            <span className="flex-1 font-medium">{s.component}</span>
            <span className="text-sm text-muted-foreground">{s.ok ? "Opérationnel" : "Perturbé"} · disponibilité 7 j : {s.uptime_7d ?? "—"} %</span>
          </div>
        ))}</div>
      </>)}
    </PageShell>
  );
}
