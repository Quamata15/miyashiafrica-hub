// Services: booking slots (#31), quotes (#32), portfolio (#33).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, FileText, Loader2, Plus, Trash2, Upload, Video } from "lucide-react";

const TZ = "Africa/Abidjan";
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const fmtDay = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function BookingPicker({ serviceId, price, providerId }: { serviceId: string; price: number | null; providerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 86_400_000));
  const [day, setDay] = useState(isoDate(days[0]));
  const [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[] | null>(null);
  const [hasAgenda, setHasAgenda] = useState<boolean | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.from("provider_availability").select("id", { count: "exact", head: true }).eq("provider_id", providerId).then(({ count }) => setHasAgenda((count ?? 0) > 0)); }, [providerId]);
  useEffect(() => { setSlots(null); setPick(null); supabase.rpc("get_available_slots", { p_service_id: serviceId, p_date: day }).then(({ data }) => setSlots(data ?? [])); }, [serviceId, day]);
  if (!hasAgenda || price == null) return null;

  const book = async () => {
    if (!user) return navigate("/auth");
    if (!pick) return;
    setBusy(true);
    const { error } = await supabase.rpc("book_slot", { p_service_id: serviceId, p_starts_at: pick, p_notes: notes || undefined });
    setBusy(false);
    if (error) return toast.error(errMsg(error), errMsg(error).includes("Solde") ? { action: { label: "Recharger", onClick: () => navigate("/wallet") } } : undefined);
    toast.success("Rendez-vous réservé, paiement bloqué en séquestre");
    navigate("/bookings");
  };

  return (
    <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
      <p className="font-semibold flex items-center gap-2"><CalendarClock className="w-5 h-5 text-primary" />Réserver un créneau</p>
      <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Jour">
        {days.map((d) => (
          <button key={isoDate(d)} role="option" aria-selected={day === isoDate(d)} onClick={() => setDay(isoDate(d))}
            className={`shrink-0 px-3 py-2 rounded-xl border text-sm capitalize ${day === isoDate(d) ? "border-primary bg-primary/10" : "border-foreground/15"}`}>{fmtDay(d)}</button>
        ))}
      </div>
      {slots === null ? <Loader2 className="w-5 h-5 animate-spin" /> : slots.length ? (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <button key={s.starts_at} onClick={() => setPick(s.starts_at)} className={`px-3 py-1.5 rounded-lg border text-sm ${pick === s.starts_at ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 hover:border-primary/50"}`}>{fmtTime(s.starts_at)}</button>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Aucun créneau libre ce jour-là.</p>}
      {pick && (<>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adresse ou précisions pour le prestataire" aria-label="Précisions" />
        <Button onClick={book} disabled={busy} className="w-full">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Réserver à {fmtTime(pick)} — {fcfa(price)}</Button>
        <p className="text-xs text-muted-foreground">Payé depuis votre portefeuille, bloqué jusqu'à la prestation. Annulation gratuite jusqu'à 24 h avant.</p>
      </>)}
    </div>
  );
}

const WEEK = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
type Avail = { id?: string; weekday: number; start_time: string; end_time: string; slot_minutes: number };

export function AvailabilityEditor() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Avail[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) supabase.from("provider_availability").select("*").eq("provider_id", user.id).order("weekday").then(({ data }) => setRows((data ?? []).map((r) => ({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) })))); }, [user]);
  const save = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("provider_availability").delete().eq("provider_id", user.id);
    const { error } = rows.length ? await supabase.from("provider_availability").insert(rows.map(({ id: _id, ...r }) => ({ ...r, provider_id: user.id }))) : { error: null };
    setBusy(false);
    if (error) return toast.error("Horaires invalides (la fin doit être après le début)");
    toast.success("Agenda enregistré");
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Vos clients réservent et paient un créneau sur vos fiches services. Heure GMT (Lomé, Abidjan, Dakar…).</p>
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select value={r.weekday} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, weekday: Number(e.target.value) } : x)))} className="h-10 rounded-md border border-input bg-background px-2" aria-label="Jour">{WEEK.map((w, k) => <option key={k} value={k}>{w}</option>)}</select>
          <Input type="time" value={r.start_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} className="w-32" aria-label="Début" />
          <span>à</span>
          <Input type="time" value={r.end_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, end_time: e.target.value } : x)))} className="w-32" aria-label="Fin" />
          <select value={r.slot_minutes} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, slot_minutes: Number(e.target.value) } : x)))} className="h-10 rounded-md border border-input bg-background px-2" aria-label="Durée d'un créneau">{[30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
          <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setRows([...rows, { weekday: 1, start_time: "08:00", end_time: "12:00", slot_minutes: 60 }])}><Plus className="w-4 h-4 mr-1" />Plage horaire</Button>
        <Button size="sm" onClick={save} disabled={busy}>Enregistrer l'agenda</Button>
      </div>
    </div>
  );
}

type Line = { label: string; qty: string; unit_price: string };

export function QuoteDialog({ clientId, trigger, onSent, request }: { clientId: string; trigger?: React.ReactNode; onSent?: () => void;
  request?: { id: string; service_id: string | null; on_site: boolean; location: string | null; preferred_date: string | null } | null }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<Line[]>([{ label: "", qty: "1", unit_price: "" }]);
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState("15");
  const [services, setServices] = useState<{ id: string; title: string }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("");
  const [onSite, setOnSite] = useState(false);
  const [place, setPlace] = useState("");
  useEffect(() => { if (open && user) supabase.from("services").select("id, title").eq("provider_id", user.id).then(({ data }) => setServices(data ?? [])); }, [open, user]);
  // Answering a client's request: start from what they asked.
  useEffect(() => {
    if (!open || !request) return;
    if (request.service_id) setServiceId(request.service_id);
    setOnSite(request.on_site); setPlace(request.location ?? "");
    if (request.preferred_date && request.preferred_date >= new Date().toISOString().slice(0, 10)) setStart(request.preferred_date);
  }, [open, request]);
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("send_quote", {
      p_client_id: clientId, p_title: title, p_items: lines.filter((l) => l.label).map((l) => ({ label: l.label, qty: Number(l.qty), unit_price: Number(l.unit_price) })),
      p_service_id: serviceId || undefined, p_notes: notes || undefined, p_valid_days: Number(days) || 15,
      p_terms: terms || undefined, p_start_date: start || undefined, p_duration_days: duration ? Number(duration) : undefined,
      p_on_site: onSite, p_location: onSite ? place : undefined, p_request_id: request?.id,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Devis envoyé"); setOpen(false); onSent?.();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" />Envoyer un devis</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau devis</DialogTitle><DialogDescription>Le client l'accepte en ligne : le montant est alors bloqué en séquestre jusqu'à la fin de la prestation.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="q-title">Objet</Label><Input id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Installation électrique d'un salon" /></div>
          {services.length > 0 && <div><Label htmlFor="q-svc">Service lié (facultatif)</Label><select id="q-svc" value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3"><option value="">—</option>{services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>}
          <div className="space-y-2">
            <Label>Lignes</Label>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_110px_auto] gap-2">
                <Input placeholder="Désignation" value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Désignation" />
                <Input type="number" placeholder="Qté" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} aria-label="Quantité" />
                <Input type="number" placeholder="Prix unit." value={l.unit_price} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit_price: e.target.value } : x)))} aria-label="Prix unitaire" />
                <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, { label: "", qty: "1", unit_price: "" }])}><Plus className="w-4 h-4 mr-1" />Ligne</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="q-start">Début</Label><Input id="q-start" type="date" min={new Date().toISOString().slice(0, 10)} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label htmlFor="q-dur">Durée (jours)</Label><Input id="q-dur" type="number" min={1} max={365} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex. : 5" /></div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">Je me déplace chez le client</span><Switch checked={onSite} onCheckedChange={setOnSite} /></label>
          {onSite && <div><Label htmlFor="q-place">Lieu</Label><Input id="q-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Quartier, ville" /></div>}
          <div><Label htmlFor="q-terms">Termes et accords</Label><Textarea id="q-terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Ce qui est inclus, matériel, frais de déplacement, révisions, livrables, ce qui se passe en cas de retard…" /></div>
          <div><Label htmlFor="q-notes">Remarques (facultatif)</Label><Textarea id="q-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Précisions pour le client" /></div>
          <p className="text-xs text-muted-foreground">Le client accepte ces termes en payant : l'argent est bloqué en séquestre et vous commencez seulement après. Les coordonnées (numéros, e-mails, WhatsApp) sont masquées.</p>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><span>Valable</span><Input type="number" className="w-20" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Validité en jours" /><span>jours</span></div><p className="text-lg font-bold">Total : {fcfa(total)}</p></div>
        </div>
        <DialogFooter><Button onClick={send} disabled={busy || !title || total <= 0}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Envoyer le devis</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type PortfolioItem = { id: string; title: string; description: string | null; media_url: string; media_type: string; link_url: string | null };

export function PortfolioGrid({ userId, editable }: { userId: string; editable?: boolean }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from("portfolio_items").select("*").eq("user_id", userId).order("sort_order").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);
  const add = async () => {
    if (!file || !title) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Fichier trop lourd (25 Mo max)");
    setBusy(true);
    try {
      const url = await uploadFile("portfolios", userId, file);
      const { error } = await supabase.from("portfolio_items").insert({ user_id: userId, title, description: desc || null, link_url: link || null, media_url: url, media_type: file.type.startsWith("video") ? "video" : "image" });
      if (error) throw error;
      setTitle(""); setDesc(""); setLink(""); setFile(null); setAdding(false); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  if (!items.length && !editable) return null;
  return (
    <section className="space-y-3" aria-label="Portfolio">
      <div className="flex items-center justify-between"><h2 className="text-xl font-display font-bold">Réalisations</h2>{editable && <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>}</div>
      {editable && adding && (
        <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titre" />
          <Textarea rows={2} placeholder="Ce que vous avez fait, pour qui, en combien de temps" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Description" />
          <Input placeholder="Lien (facultatif)" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Lien" />
          <label className="flex items-center gap-2 text-sm cursor-pointer"><Upload className="w-4 h-4" />{file ? file.name : "Photo ou vidéo"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <Button onClick={add} disabled={busy || !file || !title}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Publier</Button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <figure key={it.id} className="relative rounded-2xl overflow-hidden border border-foreground/10 bg-card">
            {it.media_type === "video" ? <video src={it.media_url} controls preload="metadata" className="w-full aspect-video object-cover" /> : <img src={it.media_url} alt={it.title} loading="lazy" className="w-full aspect-square object-cover" />}
            <figcaption className="p-3"><p className="font-medium text-sm flex items-center gap-1">{it.media_type === "video" && <Video className="w-3 h-3" />}{it.title}</p>{it.description && <p className="text-xs text-muted-foreground line-clamp-2">{it.description}</p>}{it.link_url && <a href={it.link_url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary">Voir le projet</a>}</figcaption>
            {editable && <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-8 w-8" aria-label="Supprimer" onClick={async () => { await supabase.from("portfolio_items").delete().eq("id", it.id); load(); }}><Trash2 className="w-4 h-4" /></Button>}
          </figure>
        ))}
      </div>
      {editable && !items.length && !adding && <p className="text-sm text-muted-foreground">Montrez vos meilleurs travaux : les clients choisissent sur preuve.</p>}
    </section>
  );
}
