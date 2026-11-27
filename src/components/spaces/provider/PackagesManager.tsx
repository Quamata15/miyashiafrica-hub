// Basic / Standard / Premium packs for each service: price, delay, revisions, what's included.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Save, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Section, attempt, fcfa } from "../kit";

type Pack = { id?: string; tier: "basic" | "standard" | "premium"; name: string; description: string; price: number; delivery_days: number; revisions: number; features: string[]; is_active: boolean };
const TIERS: { tier: Pack["tier"]; label: string; hint: string }[] = [
  { tier: "basic", label: "Basique", hint: "L'essentiel, pour découvrir" },
  { tier: "standard", label: "Standard", hint: "Le plus choisi" },
  { tier: "premium", label: "Premium", hint: "Complet, prioritaire" },
];
const blank = (tier: Pack["tier"], base: number): Pack => ({ tier, name: TIERS.find((t) => t.tier === tier)!.label, description: "", price: Math.round(base * (tier === "basic" ? 1 : tier === "standard" ? 1.6 : 2.5)), delivery_days: tier === "premium" ? 2 : tier === "standard" ? 4 : 7, revisions: tier === "premium" ? 3 : tier === "standard" ? 2 : 1, features: [], is_active: false });

export default function PackagesManager() {
  const { user } = useAuth();
  const [services, setServices] = useState<{ id: string; title: string; price: number | null }[] | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("services").select("id, title, price").eq("provider_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setServices(data ?? []); if (data?.[0]) setServiceId(data[0].id);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!serviceId) return;
    const base = Number(services?.find((s) => s.id === serviceId)?.price ?? 10000) || 10000;
    supabase.from("service_packages").select("*").eq("service_id", serviceId).then(({ data }) => {
      setPacks(TIERS.map(({ tier }) => {
        const p = data?.find((d) => d.tier === tier);
        return p ? { ...p, description: p.description ?? "", features: p.features ?? [] } as Pack : blank(tier, base);
      }));
    });
  }, [serviceId, services]);

  const update = (tier: string, patch: Partial<Pack>) => setPacks((ps) => ps.map((p) => (p.tier === tier ? { ...p, ...patch } : p)));

  const save = async (p: Pack) => {
    setSaving(p.tier);
    const row = { service_id: serviceId, tier: p.tier, name: p.name.trim(), description: p.description.trim() || null, price: Math.round(p.price), delivery_days: p.delivery_days, revisions: p.revisions, features: p.features.filter(Boolean).slice(0, 12), is_active: p.is_active };
    const ok = await attempt(() => supabase.from("service_packages").upsert(row, { onConflict: "service_id,tier" }), `Formule ${p.name} enregistrée`);
    if (ok) { const { data } = await supabase.from("service_packages").select("id").eq("service_id", serviceId).eq("tier", p.tier).maybeSingle(); update(p.tier, { id: data?.id }); }
    setSaving(null);
  };
  const remove = async (p: Pack) => {
    if (!p.id) return;
    if (await attempt(() => supabase.from("service_packages").delete().eq("id", p.id!), "Formule supprimée")) update(p.tier, { id: undefined, is_active: false });
  };

  if (services === null) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!services.length) return <Section title="Formules"><Empty icon={Layers} title="Publiez d'abord un service" text="Les formules se rattachent à un service." action={<Button asChild><Link to="/create?type=service">Créer un service</Link></Button>} /></Section>;

  return (
    <Section title="Formules" description="Proposez trois niveaux de prestation à prix fixe : le client choisit, paie, et l'argent reste en séquestre jusqu'à la fin du travail."
      action={<Select value={serviceId} onValueChange={setServiceId}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent></Select>}>
      <div className="grid gap-4 lg:grid-cols-3">
        {packs.map((p) => {
          const t = TIERS.find((x) => x.tier === p.tier)!;
          return (
            <div key={p.tier} className={`rounded-2xl border p-4 space-y-3 ${p.tier === "standard" ? "border-primary/40 bg-primary/[0.04]" : "border-foreground/10"}`}>
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{t.label}</p><p className="text-xs text-muted-foreground">{t.hint}</p></div>
                <label className="flex items-center gap-2 text-xs">En vente <Switch checked={p.is_active} onCheckedChange={(v) => update(p.tier, { is_active: v })} /></label>
              </div>
              <div><Label className="text-xs">Nom</Label><Input value={p.name} maxLength={60} onChange={(e) => update(p.tier, { name: e.target.value })} /></div>
              <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2">
                <div><Label className="text-xs">Prix (FCFA)</Label><Input type="number" min={500} step={500} value={p.price} onChange={(e) => update(p.tier, { price: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Délai (j)</Label><Input type="number" min={0} max={365} value={p.delivery_days} onChange={(e) => update(p.tier, { delivery_days: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Retouches</Label><Input type="number" min={0} max={20} value={p.revisions} onChange={(e) => update(p.tier, { revisions: Number(e.target.value) })} /></div>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea rows={2} maxLength={600} value={p.description} onChange={(e) => update(p.tier, { description: e.target.value })} placeholder="Ce que le client obtient" /></div>
              <div><Label className="text-xs">Inclus (une ligne par élément)</Label><Textarea rows={4} value={p.features.join("\n")} onChange={(e) => update(p.tier, { features: e.target.value.split("\n") })} placeholder={"Déplacement inclus\nMatériel fourni\nGarantie 3 mois"} /></div>
              <p className="text-xs text-muted-foreground">Vous recevez {fcfa(Math.round(p.price * 0.9))} après commission.</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={saving === p.tier || p.price < 500 || p.name.trim().length < 2} onClick={() => save(p)}>
                  {saving === p.tier ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer
                </Button>
                {p.id && <Button size="sm" variant="outline" aria-label={`Supprimer la formule ${p.name}`} onClick={() => remove(p)}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
