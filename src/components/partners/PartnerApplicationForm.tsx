// Multi-step application for pickup point partners, saved as a draft at every step.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { DAYS, type Hours } from "@/lib/hours";
import { errMsg, fileToDataUrl } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Crosshair, FileUp, Loader2, Paperclip, Trash2 } from "lucide-react";
import { REQUIRED_DOCS } from "./PickupProgramInfo";
import { COUNTRY_OPTIONS } from "@/components/commerce/ProductExtras";

export type Application = Tables<"pickup_partner_applications">;

const STEPS = ["Entreprise", "Responsable", "Local", "Paiements", "Pièces", "Engagements", "Envoi"];
const COMMITMENTS: [string, string][] = [
  ["charter", "J'ai lu et j'accepte la charte des points relais MIYASHI (engagements ci-dessus)."],
  ["storage_rules", "Les colis seront rangés dans un espace fermé à clé, jamais ouverts, et gardés au maximum le délai prévu."],
  ["prohibited_goods", "Je refuserai et signalerai tout colis contenant un produit interdit."],
  ["data_protection", "Je garderai confidentielles les informations des clients."],
  ["verification_consent", "J'accepte la vérification de mes pièces, un appel et une visite de mon local, photos comprises."],
  ["truthful", "Je certifie que les informations et documents fournis sont exacts et authentiques."],
];

export default function PartnerApplicationForm({ initial, onSubmitted }: { initial: Application | null; onSubmitted: (a: Application) => void }) {
  const { user } = useAuth();
  const [a, setA] = useState<Partial<Application>>(initial ?? { country: "TG", opening_hours: {}, documents: {}, commitments: {} });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const docs = (a.documents ?? {}) as Record<string, string>;
  const commitments = (a.commitments ?? {}) as Record<string, boolean>;
  const hours = (a.opening_hours ?? {}) as Hours;
  const set = <K extends keyof Application>(k: K, v: Application[K]) => setA((x) => ({ ...x, [k]: v }));

  useEffect(() => { if (initial) setA(initial); }, [initial]);

  const save = async (): Promise<Application | null> => {
    if (!user) return null;
    setSaving(true);
    const { id: _id, user_id: _u, status: _s, created_at: _c, updated_at: _up, ...fields } = a as Application;
    const editable: TablesUpdate<"pickup_partner_applications"> = Object.fromEntries(Object.entries(fields).filter(([k]) =>
      !k.startsWith("check_") && !["admin_notes", "reviewer_id", "pickup_point_id", "decision_reason", "site_visit_at", "site_visit_notes", "info_request", "submitted_at", "decided_at"].includes(k)));
    const res = a.id
      ? await supabase.from("pickup_partner_applications").update(editable).eq("id", a.id).select("*").single()
      : await supabase.from("pickup_partner_applications").insert({ ...editable, user_id: user.id, status: "draft" }).select("*").single();
    setSaving(false);
    if (res.error) { toast.error(errMsg(res.error)); return null; }
    setA(res.data);
    return res.data;
  };

  const next = async () => { if (await save()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };

  const upload = async (key: string, file?: File) => {
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Fichier trop lourd (10 Mo maximum)");
    setUploading(key);
    try {
      let blob: Blob = file; let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      if (file.type.startsWith("image/")) { blob = await (await fetch(await fileToDataUrl(file, 2000))).blob(); ext = "jpg"; }
      else if (file.type !== "application/pdf") throw new Error("Formats acceptés : photo ou PDF");
      const path = `${user.id}/${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("partner-documents").upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) throw error;
      if (docs[key]) await supabase.storage.from("partner-documents").remove([docs[key]]);
      set("documents", { ...docs, [key]: path });
      toast.success("Document ajouté");
    } catch (e) { toast.error(errMsg(e)); } finally { setUploading(null); }
  };
  const removeDoc = async (key: string) => {
    if (docs[key]) await supabase.storage.from("partner-documents").remove([docs[key]]);
    const d = { ...docs }; delete d[key]; set("documents", d);
  };
  const viewDoc = async (path: string) => {
    const { data } = await supabase.storage.from("partner-documents").createSignedUrl(path, 120);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  };

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation indisponible");
    navigator.geolocation.getCurrentPosition(
      (p) => { setA((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })); toast.success("Position du local enregistrée"); },
      () => toast.error("Position refusée : faites-le depuis le local, GPS activé"), { enableHighAccuracy: true, timeout: 15000 });
  };
  const toggleDay = (d: keyof Hours, on: boolean) => { const h = { ...hours }; if (on) h[d] = [["08:00", "19:00"]]; else delete h[d]; set("opening_hours", h); };
  const setTime = (d: keyof Hours, i: 0 | 1, v: string) => set("opening_hours", { ...hours, [d]: [[i === 0 ? v : hours[d]![0][0], i === 1 ? v : hours[d]![0][1]]] });

  const submit = async () => {
    const saved = await save();
    if (!saved) return;
    const { data, error } = await supabase.rpc("submit_partner_application", { p_id: saved.id });
    if (error) return toast.error(errMsg(error));
    const r = data as { success: boolean; missing?: string[] };
    if (!r.success) { setMissing(r.missing ?? []); toast.error("Il manque des éléments : voir la liste"); return; }
    toast.success("Candidature envoyée ! Nous revenons vers vous rapidement.");
    const { data: fresh } = await supabase.from("pickup_partner_applications").select("*").eq("id", saved.id).single();
    if (fresh) onSubmitted(fresh);
  };

  const requiredDocs = REQUIRED_DOCS.filter((d) => !d.optional);
  const docsDone = requiredDocs.filter((d) => docs[d.key]).length;
  const field = (k: keyof Application, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><Label htmlFor={`pa-${String(k)}`}>{label}</Label>
      <Input id={`pa-${String(k)}`} value={(a[k] as string | number | null) ?? ""} {...props}
        onChange={(e) => set(k, (props.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value) as never)} /></div>
  );
  const toggle = (k: keyof Application, label: string, hint?: string) => (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-foreground/10 p-3">
      <span><span className="text-sm font-medium block">{label}</span>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</span>
      <Switch checked={!!a[k]} onCheckedChange={(v) => set(k, v as never)} />
    </label>
  );

  const body = useMemo(() => step, [step]);
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card/80 p-5 md:p-8">
      {a.status === "info_requested" && a.info_request && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm"><strong>Compléments demandés :</strong> {a.info_request}</div>
      )}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2"><span className="font-medium">Étape {step + 1} sur {STEPS.length} : {STEPS[step]}</span>{saving && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Enregistrement</span>}</div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Progression du dossier" />
        <div className="hidden md:flex justify-between mt-2 text-xs text-muted-foreground">{STEPS.map((s, i) => <button key={s} type="button" onClick={() => setStep(i)} className={i === step ? "text-primary font-medium" : "hover:text-foreground"}>{s}</button>)}</div>
      </div>

      {body === 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {field("company_name", "Raison sociale ou nom commercial *")}
          <div><Label htmlFor="pa-bt">Type d'activité *</Label>
            <select id="pa-bt" value={a.business_type ?? ""} onChange={(e) => set("business_type", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">
              <option value="">Choisir…</option>{["Boutique / supérette", "Agence de transport ou logistique", "Station-service", "Point de transfert d'argent", "Téléphonie", "Pharmacie", "Librairie / papeterie", "Autre"].map((x) => <option key={x}>{x}</option>)}
            </select></div>
          <div><Label htmlFor="pa-lf">Forme juridique</Label>
            <select id="pa-lf" value={a.legal_form ?? ""} onChange={(e) => set("legal_form", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">
              <option value="">Choisir…</option>{["Entreprise individuelle", "SARL", "SARLU", "SA", "SAS", "GIE", "Coopérative", "Autre"].map((x) => <option key={x}>{x}</option>)}
            </select></div>
          {field("year_founded", "Année de création", { type: "number", min: 1950, max: new Date().getFullYear() })}
          {field("rccm_number", "Numéro RCCM *", { placeholder: "TG-LOM-01-2024-A10-00000" })}
          {field("nif_number", "Numéro d'identification fiscale (NIF) *")}
        </div>
      )}

      {body === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          {field("manager_name", "Nom et prénoms du responsable *")}
          {field("manager_role", "Fonction", { placeholder: "Gérant, propriétaire…" })}
          <div><Label htmlFor="pa-idt">Pièce d'identité *</Label>
            <select id="pa-idt" value={a.manager_id_type ?? ""} onChange={(e) => set("manager_id_type", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">
              <option value="">Choisir…</option>{["Carte nationale d'identité", "Passeport", "Carte consulaire", "Carte d'électeur", "Permis de conduire"].map((x) => <option key={x}>{x}</option>)}
            </select></div>
          {field("manager_id_number", "Numéro de la pièce *")}
          {field("phone", "Téléphone du point relais *", { type: "tel", placeholder: "+228 90 00 00 00" })}
          {field("whatsapp", "WhatsApp", { type: "tel" })}
          {field("email", "E-mail professionnel", { type: "email" })}
        </div>
      )}

      {body === 2 && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label htmlFor="pa-c">Pays *</Label><select id="pa-c" value={a.country ?? "TG"} onChange={(e) => set("country", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">{COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
            {field("city", "Ville *")}
            {field("district", "Quartier")}
            {field("address", "Adresse du local *", { placeholder: "Rue, numéro, carrefour…" })}
            {field("landmark", "Point de repère", { placeholder: "En face de la station, à côté de l'école…" })}
            <div><Label htmlFor="pa-ps">Le local est…</Label><select id="pa-ps" value={a.premises_status ?? ""} onChange={(e) => set("premises_status", (e.target.value || null) as Application["premises_status"])} className="w-full h-10 rounded-md border border-input bg-background px-3"><option value="">Choisir…</option><option value="owner">À moi / à l'entreprise</option><option value="tenant">En location</option><option value="other">Autre</option></select></div>
          </div>
          <Button type="button" variant="outline" onClick={locate}><Crosshair className="w-4 h-4 mr-2" />{a.lat ? `Position GPS enregistrée (${a.lat.toFixed(4)}, ${a.lng?.toFixed(4)})` : "Enregistrer la position GPS (depuis le local) *"}</Button>
          <div className="grid md:grid-cols-3 gap-4">
            {field("storage_area_m2", "Surface de stockage (m²) *", { type: "number", min: 0, step: "0.5" })}
            {field("max_parcels", "Colis gérables par jour", { type: "number", min: 1 })}
            {field("staff_count", "Personnes au comptoir", { type: "number", min: 1 })}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {toggle("has_secure_storage", "Espace de stockage fermant à clé *", "Armoire, réserve ou étagère sécurisée")}
            {toggle("has_smartphone", "Smartphone au comptoir *")}
            {toggle("has_internet", "Connexion internet fiable")}
            {toggle("ground_floor_access", "Accès de plain-pied")}
            {toggle("has_cctv", "Caméra de surveillance")}
            {toggle("has_fire_extinguisher", "Extincteur")}
            {toggle("parking_nearby", "Stationnement possible devant")}
            {toggle("has_insurance", "Assurance multirisque")}
          </div>
          {a.has_insurance && field("insurer_name", "Nom de l'assureur")}
          <div>
            <p className="font-medium mb-2">Horaires d'ouverture * <span className="text-xs text-muted-foreground font-normal">(au moins 5 jours)</span></p>
            <div className="space-y-2">{DAYS.map(([d, label]) => (
              <div key={d} className="flex flex-wrap items-center gap-3">
                <Switch checked={!!hours[d]} onCheckedChange={(v) => toggleDay(d, v)} aria-label={`Ouvert le ${label}`} />
                <span className="w-24 text-sm">{label}</span>
                {hours[d] ? (<><Input type="time" value={hours[d]![0][0]} onChange={(e) => setTime(d, 0, e.target.value)} className="w-32" aria-label={`Ouverture ${label}`} /><span>à</span><Input type="time" value={hours[d]![0][1]} onChange={(e) => setTime(d, 1, e.target.value)} className="w-32" aria-label={`Fermeture ${label}`} /></>) : <span className="text-sm text-muted-foreground">Fermé</span>}
              </div>
            ))}</div>
          </div>
        </div>
      )}

      {body === 3 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label htmlFor="pa-pm">Recevoir mes rémunérations par *</Label>
            <select id="pa-pm" value={a.payout_method ?? ""} onChange={(e) => set("payout_method", (e.target.value || null) as Application["payout_method"])} className="w-full h-10 rounded-md border border-input bg-background px-3">
              <option value="">Choisir…</option><option value="mobile_money">Mobile money</option><option value="bank">Virement bancaire</option></select></div>
          {field("payout_account", a.payout_method === "bank" ? "IBAN / RIB *" : "Numéro mobile money *")}
          <p className="md:col-span-2 text-sm text-muted-foreground">Le compte doit être au nom de l'entreprise ou du responsable déclaré. Joignez un justificatif à l'étape suivante pour accélérer la vérification.</p>
        </div>
      )}

      {body === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{docsDone} / {requiredDocs.length} pièces obligatoires. Photos nettes ou PDF, 10 Mo maximum.</p>
          {REQUIRED_DOCS.map((d) => (
            <div key={d.key} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-foreground/10 p-3">
              <d.icon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium">{d.label} {d.optional ? <Badge variant="outline" className="ml-1 text-[10px]">Recommandé</Badge> : <span className="text-primary">*</span>}</p><p className="text-xs text-muted-foreground">{d.detail}</p></div>
              {docs[d.key] ? (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => viewDoc(docs[d.key])}><Paperclip className="w-4 h-4 mr-1" />Voir</Button>
                  <CheckCircle2 className="w-5 h-5 text-accent" aria-label="Déposé" />
                  <Button type="button" variant="ghost" size="icon" aria-label="Retirer" onClick={() => removeDoc(d.key)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-primary/40 text-sm text-primary cursor-pointer">
                  {uploading === d.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}Déposer
                  <input type="file" accept="image/*,application/pdf" capture={d.key.includes("photo") ? "environment" : undefined} className="sr-only" disabled={!!uploading} onChange={(e) => upload(d.key, e.target.files?.[0])} />
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      {body === 5 && (
        <div className="space-y-3">
          {COMMITMENTS.map(([k, label]) => (
            <label key={k} className="flex items-start gap-3 rounded-xl border border-foreground/10 p-3 cursor-pointer">
              <Checkbox checked={!!commitments[k]} onCheckedChange={(v) => set("commitments", { ...commitments, [k]: !!v })} className="mt-0.5" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
          <div><Label htmlFor="pa-mot">Pourquoi souhaitez-vous devenir point relais ? (facultatif)</Label>
            <Textarea id="pa-mot" rows={3} maxLength={1500} value={a.motivation ?? ""} onChange={(e) => set("motivation", e.target.value)} /></div>
        </div>
      )}

      {body === 6 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[["Entreprise", a.company_name], ["RCCM / NIF", [a.rccm_number, a.nif_number].filter(Boolean).join(" / ")], ["Responsable", a.manager_name], ["Téléphone", a.phone],
              ["Adresse", [a.address, a.district, a.city].filter(Boolean).join(", ")], ["GPS", a.lat ? "enregistré" : "manquant"], ["Stockage", a.storage_area_m2 ? `${a.storage_area_m2} m²` : "—"],
              ["Jours d'ouverture", `${Object.keys(hours).length} / 7`], ["Pièces obligatoires", `${docsDone} / ${requiredDocs.length}`], ["Engagements", `${COMMITMENTS.filter(([k]) => commitments[k]).length} / ${COMMITMENTS.length}`]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl border border-foreground/10 p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v || "—"}</p></div>
            ))}
          </div>
          {missing.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.05] p-4 text-sm">
              <p className="font-medium mb-1">À compléter avant l'envoi :</p>
              <ul className="list-disc pl-5 text-muted-foreground">{missing.map((m) => <li key={m}>{m.replace("pièce : ", "pièce : ").replace(/engagement : \w+/, "un engagement à cocher")}</li>)}</ul>
            </div>
          )}
          <Button size="lg" className="w-full" onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Envoyer ma candidature</Button>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Précédent</Button>
        {step < STEPS.length - 1 && <Button onClick={next} disabled={saving}>Enregistrer et continuer</Button>}
      </div>
    </div>
  );
}
