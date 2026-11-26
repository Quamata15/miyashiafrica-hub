// Admin panels for the new platform features: revenue (#8), moderation and fraud (#41 #42),
// delivery zones and pickup points (#25 #26), content (#47), flags and audit log (#46),
// legal documents (#48), operations: status, backups, currencies, taxes, customs (#49 #5 #30).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fcfa } from "@/lib/prefs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CrudTable from "./CrudTable";

const COUNTRIES: [string, string][] = [["TG", "Togo"], ["BJ", "Bénin"], ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["BF", "Burkina Faso"], ["ML", "Mali"], ["NE", "Niger"], ["GN", "Guinée"], ["GH", "Ghana"], ["NG", "Nigeria"], ["GW", "Guinée-Bissau"]];

type Rev = { commission_released: number; commission_pending: number; delivery_commission: number; boosts: number; gmv: number; orders: number; escrow_held: number; wallets_total: number; topups: number;
  daily: { day: string; commission: number; boosts: number; gmv: number }[]; top_sellers: { seller_id: string; full_name: string | null; gmv: number; orders: number }[] };

export function AdminRevenue() {
  const [days, setDays] = useState(30);
  const [r, setR] = useState<Rev | null>(null);
  useEffect(() => { supabase.rpc("get_platform_revenue", { p_days: days }).then(({ data, error }) => (error ? toast.error(error.message) : setR(data as Rev))); }, [days]);
  if (!r) return <Loader2 className="w-6 h-6 animate-spin" />;
  const kpi: [string, string, string?][] = [
    ["Commissions encaissées", fcfa(r.commission_released)], ["Commissions en attente", fcfa(r.commission_pending), "fonds en séquestre"],
    ["Boosts vendus", fcfa(r.boosts)], ["Commission livraison", fcfa(r.delivery_commission)],
    ["Volume des ventes", fcfa(r.gmv), `${r.orders} commandes`], ["En séquestre", fcfa(r.escrow_held)],
    ["Soldes portefeuilles", fcfa(r.wallets_total), "dû aux utilisateurs"], ["Recharges FedaPay", fcfa(r.topups)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex gap-2">{[7, 30, 90, 365].map((d) => <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} j</Button>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{kpi.map(([k, v, h]) => <Card key={k}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-bold mt-1">{v}</p>{h && <p className="text-xs text-muted-foreground">{h}</p>}</CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle className="text-base">Revenus de la plateforme par jour</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={r.daily.map((d) => ({ ...d, day: d.day.slice(5) }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={56} />
          <Tooltip formatter={(v: number) => fcfa(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
          <Area type="monotone" dataKey="commission" name="Commissions" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          <Area type="monotone" dataKey="boosts" name="Boosts" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" />
        </AreaChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Meilleurs vendeurs</CardTitle></CardHeader><CardContent>
        {r.top_sellers.map((s) => <div key={s.seller_id} className="flex justify-between text-sm py-1 border-b border-foreground/5"><Link to={`/user/${s.seller_id}`} className="hover:text-primary">{s.full_name ?? s.seller_id.slice(0, 8)}</Link><span>{fcfa(s.gmv)} · {s.orders} cmd</span></div>)}
        {!r.top_sellers.length && <p className="text-sm text-muted-foreground">Pas encore de ventes sur la période.</p>}
      </CardContent></Card>
    </div>
  );
}

type Flag = { id: string; target_type: string; target_id: string; source: string; severity: string; reasons: any[]; status: string; created_at: string };
type Risk = { user_id: string; full_name: string | null; email: string | null; score: number; signals: { signal: string; value: number }[]; updated_at: string };
const SIGNALS: Record<string, string> = { new_account_big_spend: "Compte récent, gros achats", disputes_against: "Litiges contre lui", reports: "Signalements", shared_phone: "Téléphone partagé avec un autre compte", failed_payments: "Paiements échoués", seller_cancellations: "Annulations vendeur", blocked_listings: "Annonces bloquées" };

export function AdminModeration() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const load = () => {
    supabase.from("moderation_flags").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(200).then(({ data }) => setFlags((data ?? []) as Flag[]));
    supabase.rpc("admin_risk_list", { p_min: 30 }).then(({ data }) => setRisks((data ?? []) as Risk[]));
  };
  useEffect(load, []);
  const resolve = async (f: Flag, status: "dismissed" | "actioned", deactivate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (deactivate && (f.target_type === "product" || f.target_type === "service")) await supabase.from(f.target_type === "product" ? "products" : "services").update({ is_active: false }).eq("id", f.target_id);
    if (status === "dismissed" && (f.target_type === "product" || f.target_type === "service") && f.severity === "high")
      await supabase.from(f.target_type === "product" ? "products" : "services").update({ is_active: true }).eq("id", f.target_id);
    await supabase.from("moderation_flags").update({ status, reviewed_by: user?.id }).eq("id", f.id);
    load();
  };
  const link = (f: Flag) => (f.target_type === "product" ? `/product/${f.target_id}` : f.target_type === "service" ? `/service/${f.target_id}` : f.target_type === "user" ? `/user/${f.target_id}` : null);
  return (
    <Tabs defaultValue="flags">
      <TabsList><TabsTrigger value="flags">À vérifier ({flags.length})</TabsTrigger><TabsTrigger value="risk">Risque de fraude ({risks.length})</TabsTrigger><TabsTrigger value="words">Mots interdits</TabsTrigger></TabsList>
      <TabsContent value="flags" className="space-y-3 mt-4">
        {flags.map((f) => (
          <Card key={f.id}><CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={f.severity === "high" ? "destructive" : "secondary"}>{f.severity === "high" ? "Grave" : f.severity === "medium" ? "À vérifier" : "Faible"}</Badge>
              <Badge variant="outline">{f.source === "ai" ? "IA" : f.source === "rules" ? "Mots-clés" : f.source === "risk" ? "Score de risque" : "Signalement"}</Badge>
              <span className="text-sm">{f.target_type} {link(f) ? <Link to={link(f)!} className="text-primary underline font-mono">{f.target_id.slice(0, 8)}</Link> : <span className="font-mono">{f.target_id.slice(0, 8)}</span>}</span>
              <span className="text-xs text-muted-foreground ml-auto">{new Date(f.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <ul className="text-sm text-muted-foreground list-disc pl-5">{f.reasons.map((r: any, i: number) => <li key={i}>{r.reason ?? (r.signal ? SIGNALS[r.signal] ?? r.signal : JSON.stringify(r))}{r.keyword ? ` (« ${r.keyword} »)` : ""}</li>)}</ul>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => resolve(f, "dismissed")}>Rien à signaler{f.severity === "high" && (f.target_type === "product" || f.target_type === "service") ? " (réactiver)" : ""}</Button>
              {(f.target_type === "product" || f.target_type === "service") && <Button size="sm" variant="destructive" onClick={() => resolve(f, "actioned", true)}>Masquer l'annonce</Button>}
              {f.target_type === "order" && <Button size="sm" onClick={() => resolve(f, "actioned")}>Vérifié</Button>}
            </div>
          </CardContent></Card>
        ))}
        {!flags.length && <p className="text-sm text-muted-foreground">Rien à vérifier.</p>}
      </TabsContent>
      <TabsContent value="risk" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Score de 0 à 100 recalculé chaque nuit et à chaque commande de plus de 50 000 F. Il signale, il ne bloque pas.</p>
        <div className="space-y-2">{risks.map((r) => (
          <div key={r.user_id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-foreground/10 p-3">
            <Badge variant={r.score >= 70 ? "destructive" : "secondary"} className="w-14 justify-center">{r.score}</Badge>
            <div className="flex-1"><Link to={`/user/${r.user_id}`} className="font-medium hover:text-primary">{r.full_name ?? r.email}</Link><p className="text-xs text-muted-foreground">{r.email}</p></div>
            <p className="text-sm text-muted-foreground">{r.signals.map((s) => `${SIGNALS[s.signal] ?? s.signal} (${s.value})`).join(" · ")}</p>
          </div>
        ))}{!risks.length && <p className="text-sm text-muted-foreground">Aucun compte à risque.</p>}</div>
      </TabsContent>
      <TabsContent value="words" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">« Bloquer » masque l'annonce aussitôt ; « À vérifier » la signale seulement.</p>
        <CrudTable table="banned_keywords" pk="keyword" order="keyword" fields={[
          { key: "keyword", label: "Mot ou expression", required: true },
          { key: "severity", label: "Action", type: "select", options: [["block", "Bloquer"], ["review", "À vérifier"]] },
          { key: "reason", label: "Raison", required: true },
        ]} defaults={{ severity: "review" }} />
      </TabsContent>
    </Tabs>
  );
}

export function AdminDelivery() {
  return (
    <Tabs defaultValue="zones">
      <TabsList><TabsTrigger value="zones">Zones et tarifs</TabsTrigger><TabsTrigger value="points">Points relais</TabsTrigger><TabsTrigger value="customs">Douane et TVA</TabsTrigger></TabsList>
      <TabsContent value="zones" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Tarif affiché au client avant de choisir le livreur. Laissez le quartier vide pour toute la ville.</p>
        <CrudTable table="delivery_zones" order="city" defaults={{ country: "TG", eta_hours: 24, is_active: true }} fields={[
          { key: "country", label: "Pays", type: "select", options: COUNTRIES }, { key: "city", label: "Ville", required: true }, { key: "district", label: "Quartier" },
          { key: "base_fee", label: "Tarif (F)", type: "number", required: true }, { key: "eta_hours", label: "Délai (h)", type: "number" }, { key: "is_active", label: "Active", type: "bool" },
        ]} />
      </TabsContent>
      <TabsContent value="points" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Le partenaire (e-mail de son compte MIYASHI) gère les colis depuis la page « Point relais ».</p>
        <CrudTable table="pickup_points" order="city" defaults={{ country: "TG", is_active: true }} fields={[
          { key: "name", label: "Nom", required: true }, { key: "city", label: "Ville", required: true }, { key: "address", label: "Adresse", required: true },
          { key: "country", label: "Pays", type: "select", options: COUNTRIES, hideInList: true }, { key: "opening_hours", label: "Horaires", placeholder: "Lun–Sam 8h–19h" },
          { key: "phone", label: "Téléphone", hideInList: true }, { key: "lat", label: "Latitude", type: "number", hideInList: true }, { key: "lng", label: "Longitude", type: "number", hideInList: true },
          { key: "partner_id", label: "Partenaire (e-mail ou id)", hideInList: true, toDb: async (v: string) => {
            if (!v || /^[0-9a-f-]{36}$/.test(v)) return v || null;
            const { data } = await supabase.rpc("admin_find_user", { p_email: v });
            if (!data) throw new Error("Aucun compte avec cet e-mail");
            return data;
          } },
          { key: "is_active", label: "Ouvert", type: "bool" },
        ]} />
      </TabsContent>
      <TabsContent value="customs" className="mt-4 space-y-6">
        <div><p className="font-medium mb-2">Règles de douane (estimation affichée sur les fiches produits)</p>
          <CrudTable table="customs_rules" order="to_country" fields={[
            { key: "from_zone", label: "Depuis", placeholder: "UEMOA, * ou code pays", required: true }, { key: "to_country", label: "Vers", type: "select", options: COUNTRIES },
            { key: "duty_rate", label: "Droits (%)", type: "number" }, { key: "fixed_fee", label: "Frais fixes", type: "number" }, { key: "apply_vat", label: "TVA", type: "bool" },
            { key: "priority", label: "Priorité", type: "number" }, { key: "note", label: "Note", hideInList: true },
          ]} defaults={{ from_zone: "*", to_country: "TG", duty_rate: 20, fixed_fee: 0, apply_vat: true, priority: 0 }} /></div>
        <div><p className="font-medium mb-2">Taux de TVA</p>
          <CrudTable table="tax_rates" pk="country" order="country" canDelete={false} fields={[{ key: "country", label: "Code" }, { key: "name", label: "Pays" }, { key: "rate", label: "Taux (%)", type: "number" }]} /></div>
      </TabsContent>
    </Tabs>
  );
}

export function AdminContent() {
  const [hero, setHero] = useState<Record<string, any> | null>(null);
  const [ann, setAnn] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    supabase.from("site_content").select("key, value").in("key", ["home_hero", "announcement"]).then(({ data }) => {
      setHero((data?.find((d) => d.key === "home_hero")?.value as any) ?? {});
      setAnn((data?.find((d) => d.key === "announcement")?.value as any) ?? { enabled: false, text: "", href: "" });
    });
  }, []);
  const save = async (key: string, value: unknown) => {
    const { error } = await supabase.from("site_content").upsert({ key, value: value as any, updated_at: new Date().toISOString() });
    error ? toast.error(error.message) : toast.success("Publié");
  };
  return (
    <div className="space-y-6">
      {ann && <Card><CardHeader><CardTitle className="text-base">Bandeau d'annonce (haut du site)</CardTitle></CardHeader><CardContent className="space-y-3">
        <label className="flex items-center justify-between"><span className="text-sm">Afficher</span><Switch checked={!!ann.enabled} onCheckedChange={(v) => setAnn({ ...ann, enabled: v })} /></label>
        <Input value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} placeholder="Livraison offerte ce week-end à Lomé" aria-label="Texte" />
        <Input value={ann.href} onChange={(e) => setAnn({ ...ann, href: e.target.value })} placeholder="/marketplace (facultatif)" aria-label="Lien" />
        <Button size="sm" onClick={() => save("announcement", ann)}>Publier</Button>
      </CardContent></Card>}
      {hero && <Card><CardHeader><CardTitle className="text-base">Accueil : titre et recherches rapides</CardTitle></CardHeader><CardContent className="space-y-3">
        <div><Label>Accroche</Label><Input value={hero.eyebrow ?? ""} onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-3"><div><Label>Titre ligne 1</Label><Input value={hero.title_1 ?? ""} onChange={(e) => setHero({ ...hero, title_1: e.target.value })} /></div><div><Label>Titre ligne 2 (or)</Label><Input value={hero.title_2 ?? ""} onChange={(e) => setHero({ ...hero, title_2: e.target.value })} /></div></div>
        <div><Label>Sous-titre</Label><Textarea rows={3} value={hero.subtitle ?? ""} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} /></div>
        <div><Label>Recherches rapides (séparées par des virgules)</Label><Input value={(hero.quick_searches ?? []).join(", ")} onChange={(e) => setHero({ ...hero, quick_searches: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></div>
        <Button size="sm" onClick={() => save("home_hero", hero)}>Publier</Button>
      </CardContent></Card>}
      <Card><CardHeader><CardTitle className="text-base">Bannières promotionnelles</CardTitle></CardHeader><CardContent>
        <CrudTable table="site_banners" order="sort_order" defaults={{ placement: "home_top", is_active: true, sort_order: 0 }} fields={[
          { key: "title", label: "Titre", required: true }, { key: "subtitle", label: "Sous-titre", hideInList: true },
          { key: "placement", label: "Emplacement", type: "select", options: [["home_top", "Accueil (haut)"], ["home_middle", "Accueil (milieu)"], ["marketplace_top", "Marketplace"]] },
          { key: "image_url", label: "Image (lien https)", hideInList: true }, { key: "cta_label", label: "Bouton", hideInList: true }, { key: "cta_href", label: "Lien du bouton", placeholder: "/marketplace?q=pagne", hideInList: true },
          { key: "starts_at", label: "Début", type: "datetime" }, { key: "ends_at", label: "Fin", type: "datetime" }, { key: "sort_order", label: "Ordre", type: "number", hideInList: true }, { key: "is_active", label: "Active", type: "bool" },
        ]} />
      </CardContent></Card>
    </div>
  );
}

type Audit = { id: number; actor_id: string | null; action: string; target_table: string; target_id: string | null; created_at: string; before: any; after: any };

export function AdminFlagsAudit() {
  const [log, setLog] = useState<Audit[]>([]);
  useEffect(() => { supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setLog((data ?? []) as Audit[])); }, []);
  const diff = (a: Audit) => {
    if (!a.before || !a.after) return a.action === "insert" ? "création" : "suppression";
    return Object.keys(a.after).filter((k) => !["updated_at"].includes(k) && JSON.stringify(a.after[k]) !== JSON.stringify(a.before[k])).map((k) => `${k} : ${JSON.stringify(a.before[k])} → ${JSON.stringify(a.after[k])}`).join(" ; ").slice(0, 300);
  };
  return (
    <Tabs defaultValue="flags">
      <TabsList><TabsTrigger value="flags">Fonctionnalités</TabsTrigger><TabsTrigger value="audit">Journal d'audit</TabsTrigger></TabsList>
      <TabsContent value="flags" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Activez une fonction pour tous, pour un pourcentage des visiteurs (déploiement progressif), ou coupez-la sans toucher au code.</p>
        <CrudTable table="feature_flags" pk="key" order="key" canCreate={false} canDelete={false} fields={[
          { key: "key", label: "Clé" }, { key: "description", label: "Description" }, { key: "enabled", label: "Activée", type: "bool" }, { key: "rollout_percent", label: "% des visiteurs", type: "number" },
        ]} />
      </TabsContent>
      <TabsContent value="audit" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Toutes les modifications faites par un administrateur, sans possibilité de les effacer.</p>
        <div className="space-y-1 text-sm">{log.map((a) => (
          <div key={a.id} className="flex flex-col sm:flex-row gap-1 sm:gap-3 border-b border-foreground/5 py-2">
            <span className="text-muted-foreground w-40 shrink-0">{new Date(a.created_at).toLocaleString("fr-FR")}</span>
            <span className="w-48 shrink-0"><Badge variant="outline">{a.action}</Badge> {a.target_table}</span>
            <span className="text-muted-foreground break-all">{diff(a)}</span>
          </div>
        ))}{!log.length && <p className="text-muted-foreground">Aucune action pour l'instant.</p>}</div>
      </TabsContent>
    </Tabs>
  );
}

export function AdminLegal() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">Conditions par pays (« ALL » pour tous). Le texte est en Markdown. La version active la plus récente est affichée sur la page Conditions.</p>
      <CrudTable table="legal_documents" order="country" defaults={{ country: "ALL", doc_type: "terms", version: "1.0", is_active: true }} fields={[
        { key: "country", label: "Pays", type: "select", options: [["ALL", "Tous"], ...COUNTRIES] },
        { key: "doc_type", label: "Document", type: "select", options: [["terms", "Conditions d'utilisation"], ["sales", "Conditions de vente"], ["privacy", "Confidentialité"], ["cookies", "Cookies"]] },
        { key: "version", label: "Version", required: true }, { key: "title", label: "Titre", required: true }, { key: "content", label: "Texte (Markdown)", type: "textarea", required: true, hideInList: true },
        { key: "is_active", label: "En ligne", type: "bool" },
      ]} />
    </div>
  );
}

type Status = { component: string; ok: boolean; last_checked: string; uptime_24h: number; uptime_7d: number; latency_ms: number };
type Backup = { id: string; started_at: string; finished_at: string | null; path: string | null; size_bytes: number | null; verified: boolean; error: string | null; row_counts: Record<string, number> | null };

export function AdminOps() {
  const [status, setStatus] = useState<Status[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const load = () => {
    supabase.rpc("get_status_summary").then(({ data }) => setStatus((data ?? []) as Status[]));
    supabase.from("backup_runs").select("*").order("started_at", { ascending: false }).limit(20).then(({ data }) => setBackups((data ?? []) as Backup[]));
  };
  useEffect(load, []);
  const download = async (b: Backup) => {
    const { data, error } = await supabase.storage.from("backups").createSignedUrl(b.path!, 300);
    if (error || !data) return toast.error("Téléchargement impossible");
    window.open(data.signedUrl, "_blank");
  };
  return (
    <Tabs defaultValue="status">
      <TabsList><TabsTrigger value="status">État du service</TabsTrigger><TabsTrigger value="backups">Sauvegardes</TabsTrigger><TabsTrigger value="currencies">Devises</TabsTrigger></TabsList>
      <TabsContent value="status" className="mt-4 space-y-3">
        <div className="flex items-center gap-3"><Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Actualiser</Button><Link to="/status" className="text-sm text-primary underline">Page publique</Link></div>
        {status.map((s) => (
          <div key={s.component} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${s.ok ? "bg-accent" : "bg-destructive"}`} />
            <span className="flex-1 font-medium">{s.component}</span>
            <span className="text-muted-foreground">{s.latency_ms} ms · 24 h : {s.uptime_24h ?? "—"} % · 7 j : {s.uptime_7d ?? "—"} %</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Vérification toutes les 10 minutes. Après deux échecs de suite, les administrateurs reçoivent une notification (et un e-mail si l'envoi d'e-mails est configuré).</p>
      </TabsContent>
      <TabsContent value="backups" className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Export complet chaque dimanche, relu et vérifié ligne à ligne après l'écriture. Les 8 derniers sont gardés. Les sauvegardes quotidiennes de Supabase s'y ajoutent sur les offres payantes.</p>
        {backups.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
            <span className="flex-1">{new Date(b.started_at).toLocaleString("fr-FR")}</span>
            {b.error ? <Badge variant="destructive">Échec : {b.error.slice(0, 60)}</Badge> : b.verified ? <Badge>Vérifiée</Badge> : <Badge variant="secondary">{b.finished_at ? "Non vérifiée" : "En cours"}</Badge>}
            {b.size_bytes != null && <span className="text-muted-foreground">{(b.size_bytes / 1024).toFixed(0)} Ko · {Object.values(b.row_counts ?? {}).reduce((s, n) => s + n, 0)} lignes</span>}
            {b.path && <Button size="sm" variant="outline" onClick={() => download(b)}><Download className="w-4 h-4 mr-1" />Télécharger</Button>}
          </div>
        ))}
      </TabsContent>
      <TabsContent value="currencies" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Les prix restent en FCFA ; l'équivalent s'affiche dans la devise choisie par le visiteur. Mettez à jour les taux non fixes régulièrement.</p>
        <CrudTable table="currencies" pk="code" order="code" canDelete={false} fields={[
          { key: "code", label: "Code" }, { key: "name", label: "Nom" }, { key: "symbol", label: "Symbole" }, { key: "xof_per_unit", label: "1 unité = … FCFA", type: "number" },
          { key: "decimals", label: "Décimales", type: "number", hideInList: true }, { key: "is_pegged", label: "Parité fixe", type: "bool" },
        ]} />
      </TabsContent>
    </Tabs>
  );
}
