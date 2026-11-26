// Admin review of pickup point applications: documents, verification checklist, call, site visit,
// decision. Approving creates the pickup point linked to the partner's account.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExternalLink, MapPin, Paperclip } from "lucide-react";
import { REQUIRED_DOCS, DEFAULT_PROGRAM, type Program } from "@/components/partners/PickupProgramInfo";

type App = Tables<"pickup_partner_applications">;
const LABEL: Record<string, string> = { draft: "Brouillon", submitted: "Envoyée", under_review: "En vérification", info_requested: "Compléments demandés", visit_scheduled: "Visite programmée", approved: "Acceptée", rejected: "Refusée", withdrawn: "Retirée" };
const CHECKS: [keyof App, string][] = [
  ["check_documents", "Pièces authentiques et lisibles (RCCM < 3 mois, NIF, bail/titre, justificatif d'adresse)"],
  ["check_identity", "Identité du responsable vérifiée (pièce valide, correspond au RCCM)"],
  ["check_phone", "Appel de qualification passé, numéro joignable"],
  ["check_references", "Références / voisinage / absence de fraude connue"],
  ["check_site_visit", "Visite du local : adresse, GPS, stockage fermé, sécurité, photos"],
  ["check_training", "Formation à la remise, au code et au paiement à la livraison"],
  ["check_contract", "Convention de partenariat signée"],
];

export default function AdminPartnerApplications() {
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState("open");
  const [sel, setSel] = useState<App | null>(null);
  const load = async () => {
    let q = supabase.from("pickup_partner_applications").select("*").neq("status", "draft").order("submitted_at", { ascending: false, nullsFirst: false }).limit(200);
    if (filter === "open") q = q.in("status", ["submitted", "under_review", "info_requested", "visit_scheduled"]);
    else if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setApps(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  return (
    <div className="space-y-4">
      <ProgramTerms />
      <div className="flex flex-wrap gap-2">{[["open", "À traiter"], ["approved", "Acceptées"], ["rejected", "Refusées"], ["all", "Toutes"]].map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>)}</div>
      {apps.map((a) => (
        <button key={a.id} onClick={() => setSel(a)} className="w-full text-left flex flex-wrap items-center gap-3 rounded-xl border border-foreground/10 p-3 hover:border-primary/40">
          <span className="flex-1 min-w-0"><span className="font-medium block">{a.company_name}</span><span className="text-xs text-muted-foreground">{a.business_type} · {a.city} · {a.manager_name}</span></span>
          <span className="text-xs text-muted-foreground">{CHECKS.filter(([k]) => a[k]).length}/{CHECKS.length} vérifications</span>
          <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{LABEL[a.status]}</Badge>
        </button>
      ))}
      {!apps.length && <p className="text-sm text-muted-foreground">Aucune candidature.</p>}
      {sel && <Review app={sel} onClose={() => setSel(null)} onChange={(a) => { setSel(a); load(); }} />}
    </div>
  );
}

function Review({ app, onClose, onChange }: { app: App; onClose: () => void; onChange: (a: App) => void }) {
  const [notes, setNotes] = useState(app.admin_notes ?? "");
  const [visitNotes, setVisitNotes] = useState(app.site_visit_notes ?? "");
  const [msg, setMsg] = useState("");
  const [visit, setVisit] = useState("");
  const docs = (app.documents ?? {}) as Record<string, string>;
  const hours = (app.opening_hours ?? {}) as Record<string, [string, string][]>;
  const refresh = async () => { const { data } = await supabase.from("pickup_partner_applications").select("*").eq("id", app.id).single(); if (data) onChange(data); };
  const patch = async (p: Partial<App>) => { const { error } = await supabase.from("pickup_partner_applications").update(p).eq("id", app.id); if (error) toast.error(errMsg(error)); else refresh(); };
  const act = async (action: string) => {
    const { error } = await supabase.rpc("review_partner_application", { p_id: app.id, p_action: action, p_message: msg || undefined, p_visit_at: visit ? new Date(visit).toISOString() : undefined });
    if (error) return toast.error(errMsg(error));
    toast.success("Décision enregistrée et candidat notifié"); setMsg(""); refresh();
  };
  const open = async (path: string) => { const { data } = await supabase.storage.from("partner-documents").createSignedUrl(path, 300); if (data) window.open(data.signedUrl, "_blank", "noopener"); };
  const row = (k: string, v: React.ReactNode) => <div className="grid grid-cols-[150px_1fr] gap-2 text-sm py-1 border-b border-foreground/5"><span className="text-muted-foreground">{k}</span><span>{v || "—"}</span></div>;
  const closed = ["approved", "rejected", "withdrawn"].includes(app.status);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{app.company_name} <Badge variant="outline" className="ml-2">{LABEL[app.status]}</Badge></DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium mb-1">Entreprise</p>
            {row("Activité", app.business_type)}{row("Forme", app.legal_form)}{row("RCCM", app.rccm_number)}{row("NIF", app.nif_number)}{row("Créée en", app.year_founded)}
            <p className="font-medium mt-4 mb-1">Responsable</p>
            {row("Nom", app.manager_name)}{row("Fonction", app.manager_role)}{row("Pièce", [app.manager_id_type, app.manager_id_number].filter(Boolean).join(" n° "))}
            {row("Téléphone", app.phone && <a href={`tel:${app.phone}`} className="text-primary">{app.phone}</a>)}{row("WhatsApp", app.whatsapp)}{row("E-mail", app.email)}
            <p className="font-medium mt-4 mb-1">Paiement</p>
            {row("Méthode", app.payout_method === "bank" ? "Banque" : app.payout_method === "mobile_money" ? "Mobile money" : null)}{row("Compte", app.payout_account)}
          </div>
          <div>
            <p className="font-medium mb-1">Local</p>
            {row("Adresse", [app.address, app.district, app.city, app.country].filter(Boolean).join(", "))}{row("Repère", app.landmark)}
            {row("GPS", app.lat ? <a className="text-primary inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${app.lat},${app.lng}`}><MapPin className="w-3 h-3" />Voir sur la carte</a> : null)}
            {row("Statut du local", app.premises_status === "owner" ? "Propriétaire" : app.premises_status === "tenant" ? "Locataire" : app.premises_status)}
            {row("Stockage", app.storage_area_m2 ? `${app.storage_area_m2} m² · ${app.max_parcels ?? "?"} colis/jour · ${app.staff_count ?? "?"} pers.` : null)}
            {row("Sécurité", [app.has_secure_storage && "fermé à clé", app.has_cctv && "caméra", app.has_fire_extinguisher && "extincteur", app.has_insurance && `assurance ${app.insurer_name ?? ""}`, app.ground_floor_access && "plain-pied"].filter(Boolean).join(", "))}
            {row("Horaires", Object.entries(hours).map(([d, v]) => `${d} ${v[0][0]}-${v[0][1]}`).join(", "))}
            {app.motivation && row("Motivation", app.motivation)}
          </div>
        </div>
        <div>
          <p className="font-medium mb-2">Pièces</p>
          <div className="grid sm:grid-cols-2 gap-2">{REQUIRED_DOCS.map((d) => (
            <div key={d.key} className="flex items-center gap-2 rounded-lg border border-foreground/10 p-2 text-sm">
              <span className="flex-1">{d.label}</span>
              {docs[d.key] ? <Button size="sm" variant="ghost" onClick={() => open(docs[d.key])}><Paperclip className="w-3 h-3 mr-1" />Ouvrir<ExternalLink className="w-3 h-3 ml-1" /></Button> : <span className="text-xs text-muted-foreground">{d.optional ? "non fourni" : "MANQUANT"}</span>}
            </div>
          ))}</div>
        </div>
        <div>
          <p className="font-medium mb-2">Vérifications</p>
          <div className="space-y-2">{CHECKS.map(([k, l]) => (
            <label key={String(k)} className="flex items-start gap-3 text-sm"><Checkbox disabled={closed} checked={!!app[k]} onCheckedChange={(v) => patch({ [k]: !!v } as Partial<App>)} className="mt-0.5" />{l}</label>
          ))}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Notes internes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (app.admin_notes ?? "") && patch({ admin_notes: notes })} /></div>
          <div><Label>Compte rendu de visite</Label><Textarea rows={3} value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} onBlur={() => visitNotes !== (app.site_visit_notes ?? "") && patch({ site_visit_notes: visitNotes })} /></div>
        </div>
        {!closed && (
          <div className="space-y-3 rounded-xl border border-foreground/10 p-4">
            <p className="font-medium">Décision</p>
            <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message au candidat (obligatoire pour demander des compléments ou refuser)" aria-label="Message au candidat" />
            <div className="flex flex-wrap gap-2 items-center">
              {app.status === "submitted" && <Button size="sm" variant="outline" onClick={() => act("start_review")}>Commencer l'examen</Button>}
              <Button size="sm" variant="outline" onClick={() => act("request_info")}>Demander des compléments</Button>
              <Input type="datetime-local" className="w-56" value={visit} onChange={(e) => setVisit(e.target.value)} aria-label="Date de visite" />
              <Button size="sm" variant="outline" disabled={!visit} onClick={() => act("schedule_visit")}>Programmer la visite</Button>
              <Button size="sm" onClick={() => act("approve")} disabled={CHECKS.some(([k]) => k !== "check_references" && !app[k])}>Accepter et créer le point relais</Button>
              <Button size="sm" variant="destructive" onClick={() => act("reject")}>Refuser</Button>
            </div>
          </div>
        )}
        {app.decision_reason && <p className="text-sm text-muted-foreground">Décision : {app.decision_reason}</p>}
      </DialogContent>
    </Dialog>
  );
}

function ProgramTerms() {
  const [p, setP] = useState<Program | null>(null);
  useEffect(() => { supabase.from("site_content").select("value").eq("key", "pickup_program").maybeSingle().then(({ data }) => setP({ ...DEFAULT_PROGRAM, ...((data?.value as object) ?? {}) })); }, []);
  if (!p) return null;
  const num = (k: keyof Program, l: string) => <div><Label className="text-xs">{l}</Label><Input type="number" value={p[k] as number} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} /></div>;
  const save = async () => { const { error } = await supabase.from("site_content").upsert({ key: "pickup_program", value: p as never, updated_at: new Date().toISOString() }); if (error) toast.error(error.message); else toast.success("Conditions du programme publiées"); };
  return (
    <details className="rounded-xl border border-foreground/10 p-4">
      <summary className="cursor-pointer font-medium">Conditions du programme (affichées sur la page publique)</summary>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        {num("fee_per_parcel", "F par colis remis")}{num("fee_per_cod_parcel", "F par colis encaissé")}{num("fee_per_return", "F par retour")}{num("max_storage_days", "Jours de garde max")}
        {num("review_days", "Délai d'examen (j)")}{num("min_storage_m2", "Stockage min. (m²)")}{num("min_days_open", "Jours d'ouverture min.")}
        <div><Label className="text-xs">Versement</Label><Input value={p.payout_frequency} onChange={(e) => setP({ ...p, payout_frequency: e.target.value })} /></div>
      </div>
      <Button size="sm" className="mt-3" onClick={save}>Publier</Button>
    </details>
  );
}
