// Trust & safety for the admin: fraud signals, reports and sanctions, local-language
// synonyms for search, newsletter subscribers.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Gavel, Loader2, ShieldAlert } from "lucide-react";
import CrudTable from "./CrudTable";

type Signal = { user_id: string; name: string; signal: string; value: number; detail: string };
type Violation = { id: string; seller_id: string; reported_by: string | null; violation_type: string; description: string | null; status: string; created_at: string; order_id: string | null };
type Sanction = { id: string; user_id: string; kind: string; days: number | null; note: string | null; created_at: string };
const KIND: Record<string, string> = { warning: "Avertissement", listings_suspended: "Annonces suspendues", account_suspended: "Compte suspendu", lifted: "Sanction levée" };
const VTYPE: Record<string, string> = { off_platform_contact: "Échange de coordonnées", off_platform_payment: "Paiement hors plateforme", contact_on_package: "Coordonnées sur le colis" };
const dt = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });

function useNames(ids: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    if (!key) return;
    supabase.from("profiles_public").select("user_id, full_name, username").in("user_id", key.split(",")).then(({ data }) =>
      setNames(Object.fromEntries((data ?? []).map((p) => [p.user_id!, p.username || p.full_name || "Compte"]))));
  }, [key]);
  return names;
}

export function SanctionButton({ userId, violationId, label = "Sanctionner", onDone }: { userId: string; violationId?: string; label?: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("warning");
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("apply_sanction", { p_user: userId, p_kind: kind, p_days: kind.endsWith("suspended") ? days : undefined, p_note: note.trim() || undefined, p_violation_id: violationId });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(`${KIND[kind]} appliqué(e). La personne est notifiée.`);
    setOpen(false); onDone?.();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Gavel className="w-3.5 h-3.5 mr-1" />{label}</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Appliquer une sanction</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(KIND).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg border px-2 py-2 text-xs ${kind === k ? "border-primary bg-primary/10 font-semibold" : ""}`}>{l}</button>
            ))}
          </div>
          {kind.endsWith("suspended") && <div><Label htmlFor="sd">Durée (jours)</Label><Input id="sd" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>}
          <div><Label htmlFor="sn">Motif (envoyé à la personne)</Label><Textarea id="sn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : numéros de téléphone envoyés à plusieurs acheteurs." /></div>
          <p className="text-xs text-muted-foreground">Annonces suspendues : ses produits, services et offres sont retirés et elle ne peut plus en publier. Compte suspendu : en plus, la messagerie est coupée.</p>
          <Button className="w-full" onClick={go} disabled={busy}>{busy ? "…" : "Confirmer"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Fraud() {
  const [rows, setRows] = useState<Signal[] | null>(null);
  useEffect(() => { supabase.rpc("fraud_signals").then(({ data, error }) => (error ? toast.error(errMsg(error)) : setRows((data ?? []) as Signal[]))); }, []);
  if (!rows) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Aucun signal pour le moment.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Comptes multiples (même téléphone de livraison), vendeurs qui annulent souvent, litiges en série, tentatives d'échange de coordonnées, score de risque. Un signal n'est pas une preuve : vérifiez avant de sanctionner.</p>
      {rows.map((r, i) => (
        <Card key={`${r.user_id}-${r.signal}-${i}`}><CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
          <ShieldAlert className="w-4 h-4 text-destructive" aria-hidden />
          <span className="font-semibold">{r.name}</span><Badge variant="outline">{r.signal}</Badge>
          <span className="text-muted-foreground">{r.detail}</span>
          <span className="ml-auto"><SanctionButton userId={r.user_id} /></span>
        </CardContent></Card>
      ))}
    </div>
  );
}

function Sanctions() {
  const [v, setV] = useState<Violation[] | null>(null);
  const [h, setH] = useState<Sanction[]>([]);
  const [contacts, setContacts] = useState<{ user_id: string; source: string; excerpt: string | null; created_at: string }[]>([]);
  const load = useCallback(() => {
    supabase.from("vendor_violations").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setV((data ?? []) as Violation[]));
    supabase.from("sanctions").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setH((data ?? []) as Sanction[]));
    supabase.from("contact_violations").select("user_id, source, excerpt, created_at").order("created_at", { ascending: false }).limit(50).then(({ data }) => setContacts(data ?? []));
  }, []);
  useEffect(load, [load]);
  const names = useNames([...(v ?? []).flatMap((x) => [x.seller_id, x.reported_by ?? ""]).filter(Boolean), ...h.map((x) => x.user_id), ...contacts.map((x) => x.user_id)]);
  const dismiss = async (id: string) => {
    const { error } = await supabase.from("vendor_violations").update({ status: "dismissed", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(errMsg(error)); else load();
  };
  if (!v) return <Loader2 className="w-5 h-5 animate-spin" />;
  const pending = v.filter((x) => x.status === "pending");
  return (
    <div className="space-y-5">
      <section>
        <h3 className="font-semibold mb-2">À traiter ({pending.length})</h3>
        {!pending.length && <p className="text-sm text-muted-foreground">Rien à traiter.</p>}
        <div className="space-y-2">{pending.map((x) => (
          <Card key={x.id}><CardContent className="p-3 text-sm space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">{VTYPE[x.violation_type] ?? x.violation_type}</Badge>
              <span className="font-semibold">{names[x.seller_id] ?? "Compte"}</span>
              <span className="text-xs text-muted-foreground">· {x.reported_by ? `signalé par ${names[x.reported_by] ?? "un utilisateur"}` : "signalement automatique"} · {dt(x.created_at)}</span>
            </div>
            {x.description && <p className="text-muted-foreground">{x.description}</p>}
            <div className="flex gap-2"><SanctionButton userId={x.seller_id} violationId={x.id} onDone={load} /><Button size="sm" variant="ghost" onClick={() => dismiss(x.id)}>Classer sans suite</Button></div>
          </CardContent></Card>
        ))}</div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">Dernières tentatives d'échange de coordonnées</h3>
        <div className="divide-y rounded-lg border text-sm">{contacts.map((c, i) => (
          <div key={i} className="flex flex-wrap gap-2 p-2"><span className="font-medium">{names[c.user_id] ?? "Compte"}</span><Badge variant="outline">{c.source}</Badge><span className="text-muted-foreground truncate max-w-full">{c.excerpt}</span><span className="ml-auto text-xs text-muted-foreground">{dt(c.created_at)}</span></div>
        ))}{!contacts.length && <p className="p-3 text-muted-foreground">Aucune.</p>}</div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">Sanctions appliquées</h3>
        <div className="divide-y rounded-lg border text-sm">{h.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 p-2"><span className="font-medium">{names[s.user_id] ?? "Compte"}</span>
            <Badge variant={s.kind === "lifted" ? "secondary" : "destructive"}>{KIND[s.kind]}{s.days ? ` · ${s.days} j` : ""}</Badge>
            <span className="text-muted-foreground">{s.note}</span><span className="ml-auto text-xs text-muted-foreground">{dt(s.created_at)}</span>
            {s.kind !== "lifted" && s.kind !== "warning" && <SanctionButton userId={s.user_id} label="Lever" />}
          </div>
        ))}{!h.length && <p className="p-3 text-muted-foreground">Aucune.</p>}</div>
      </section>
    </div>
  );
}

function Newsletter() {
  const [rows, setRows] = useState<{ email: string; confirmed_at: string | null; unsubscribed_at: string | null; created_at: string; source: string | null }[] | null>(null);
  useEffect(() => { supabase.from("newsletter_subscribers").select("email, confirmed_at, unsubscribed_at, created_at, source").order("created_at", { ascending: false }).limit(1000).then(({ data }) => setRows(data ?? [])); }, []);
  if (!rows) return <Loader2 className="w-5 h-5 animate-spin" />;
  const active = rows.filter((r) => r.confirmed_at && !r.unsubscribed_at);
  const csv = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿email;inscrit le\r\n" + active.map((r) => `${r.email};${r.created_at.slice(0, 10)}`).join("\r\n")], { type: "text/csv" }));
    a.download = "miyashi-newsletter.csv"; a.click();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{active.length} confirmés</Badge><Badge variant="outline">{rows.filter((r) => !r.confirmed_at).length} en attente</Badge><Badge variant="outline">{rows.filter((r) => r.unsubscribed_at).length} désinscrits</Badge>
        <Button size="sm" variant="outline" onClick={csv} disabled={!active.length}><Download className="w-3.5 h-3.5 mr-1" />Exporter les confirmés</Button>
      </div>
      <div className="divide-y rounded-lg border text-sm max-h-96 overflow-auto">{rows.map((r) => (
        <div key={r.email} className="flex flex-wrap gap-2 p-2"><span className="break-all">{r.email}</span>
          <span className="ml-auto text-xs text-muted-foreground">{r.unsubscribed_at ? "désinscrit" : r.confirmed_at ? "confirmé" : "en attente"} · {dt(r.created_at)}</span></div>
      ))}{!rows.length && <p className="p-3 text-muted-foreground">Aucun inscrit.</p>}</div>
      <p className="text-xs text-muted-foreground">L'e-mail de confirmation part quand RESEND_API_KEY et EMAIL_FROM sont réglés dans Supabase. N'écrivez qu'aux personnes confirmées.</p>
    </div>
  );
}

export default function AdminTrust() {
  return (
    <Tabs defaultValue="sanctions">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="sanctions">Signalements & sanctions</TabsTrigger>
        <TabsTrigger value="fraud">Fraude</TabsTrigger>
        <TabsTrigger value="synonyms">Mots en langues locales</TabsTrigger>
        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
      </TabsList>
      <TabsContent value="sanctions" className="mt-4"><Sanctions /></TabsContent>
      <TabsContent value="fraud" className="mt-4"><Fraud /></TabsContent>
      <TabsContent value="synonyms" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3">Un mot tapé dans la recherche (éwé, fon, wolof, dioula…) trouve aussi les produits décrits en français. Cochez « Vérifié » quand un locuteur l'a confirmé.</p>
        <CrudTable table="search_synonyms" order="term" defaults={{ lang: "ewe", verified: false }} fields={[
          { key: "term", label: "Mot recherché", required: true },
          { key: "lang", label: "Langue", type: "select", options: [["ewe", "Éwé"], ["mina", "Mina"], ["fon", "Fon"], ["wolof", "Wolof"], ["dioula", "Dioula"], ["haoussa", "Haoussa"], ["yoruba", "Yoruba"], ["autre", "Autre"]] },
          { key: "means", label: "Équivaut à (français)", required: true },
          { key: "verified", label: "Vérifié", type: "bool" },
        ]} />
      </TabsContent>
      <TabsContent value="newsletter" className="mt-4"><Newsletter /></TabsContent>
    </Tabs>
  );
}
