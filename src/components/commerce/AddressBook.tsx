// Address book with landmarks and GPS (#11). Used on /addresses and in the checkout.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Crosshair, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { COUNTRY_OPTIONS } from "./ProductExtras";

export type Address = Tables<"addresses">;

export const formatAddress = (a: Address) =>
  [a.recipient_name, a.details, a.district, a.city, a.landmark && `Repère : ${a.landmark}`, a.phone && `Tél. ${a.phone}`].filter(Boolean).join(", ");

const EMPTY = { label: "Maison", recipient_name: "", phone: "", country: "TG", city: "", district: "", landmark: "", details: "", lat: null as number | null, lng: null as number | null, is_default: false };

export function AddressForm({ onSaved, onCancel }: { onSaved: (a: Address) => void; onCancel?: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation indisponible");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })); setLocating(false); toast.success("Position enregistrée : le livreur vous trouvera plus vite"); },
      () => { setLocating(false); toast.error("Position refusée ou indisponible"); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async () => {
    if (!user) return;
    if (!f.city.trim()) return toast.error("Indiquez la ville");
    setBusy(true);
    if (f.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { data, error } = await supabase.from("addresses").insert({ ...f, user_id: user.id }).select("*").single();
    setBusy(false);
    if (error || !data) return toast.error("Adresse non enregistrée");
    toast.success("Adresse enregistrée");
    setF(EMPTY);
    onSaved(data);
  };

  return (
    <div className="space-y-3 rounded-xl border border-foreground/10 p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label htmlFor="a-label">Nom de l'adresse</Label><Input id="a-label" value={f.label} onChange={set("label")} placeholder="Maison, Bureau…" /></div>
        <div><Label htmlFor="a-name">Destinataire</Label><Input id="a-name" value={f.recipient_name} onChange={set("recipient_name")} /></div>
        <div><Label htmlFor="a-phone">Téléphone</Label><Input id="a-phone" type="tel" value={f.phone} onChange={set("phone")} placeholder="+228 90 00 00 00" /></div>
        <div>
          <Label htmlFor="a-country">Pays</Label>
          <select id="a-country" value={f.country} onChange={set("country")} className="w-full h-10 rounded-md border border-input bg-background px-3">
            {COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
        <div><Label htmlFor="a-city">Ville *</Label><Input id="a-city" value={f.city} onChange={set("city")} placeholder="Lomé" /></div>
        <div><Label htmlFor="a-district">Quartier</Label><Input id="a-district" value={f.district} onChange={set("district")} placeholder="Bè, Tokoin…" /></div>
      </div>
      <div><Label htmlFor="a-landmark">Point de repère</Label><Input id="a-landmark" value={f.landmark} onChange={set("landmark")} placeholder="Derrière la pharmacie du Grand Marché, portail bleu" /></div>
      <div><Label htmlFor="a-details">Précisions</Label><Input id="a-details" value={f.details} onChange={set("details")} placeholder="Rue, maison, étage…" /></div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crosshair className="w-4 h-4 mr-2" />}
          {f.lat ? "Position GPS ajoutée ✓" : "Ajouter ma position GPS"}
        </Button>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: !!v })} />Adresse par défaut</label>
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Annuler</Button>}
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer l'adresse</Button>
      </div>
    </div>
  );
}

export function AddressBook({ selectable, value, onSelect }: { selectable?: boolean; value?: string | null; onSelect?: (a: Address) => void }) {
  const { user } = useAuth();
  const [list, setList] = useState<Address[]>([]);
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setList(data ?? []);
    setLoaded(true);
    if (selectable && !value && data?.length) onSelect?.(data[0]);
    if (data && !data.length) setAdding(true);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const remove = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    setList((l) => l.filter((a) => a.id !== id));
  };
  const makeDefault = async (a: Address) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", a.user_id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", a.id);
    load();
  };

  if (!loaded) return <p className="text-sm text-muted-foreground">Chargement des adresses…</p>;
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <div key={a.id}
          className={`flex items-start gap-3 rounded-xl border p-3 ${selectable ? "cursor-pointer" : ""} ${value === a.id ? "border-primary bg-primary/5" : "border-foreground/10"}`}
          onClick={() => selectable && onSelect?.(a)} role={selectable ? "radio" : undefined} aria-checked={selectable ? value === a.id : undefined}
          tabIndex={selectable ? 0 : undefined} onKeyDown={(e) => selectable && (e.key === "Enter" || e.key === " ") && onSelect?.(a)}>
          <MapPin className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{a.label}{a.is_default && <span className="ml-2 text-xs text-primary">par défaut</span>}{a.lat && <span className="ml-2 text-xs text-accent">GPS</span>}</p>
            <p className="text-sm text-muted-foreground">{formatAddress(a)}</p>
          </div>
          {!selectable && (
            <div className="flex gap-1">
              {!a.is_default && <Button variant="ghost" size="icon" aria-label="Définir par défaut" onClick={() => makeDefault(a)}><Star className="w-4 h-4" /></Button>}
              <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <AddressForm onSaved={(a) => { setAdding(false); setList((l) => [a, ...l]); onSelect?.(a); }} onCancel={list.length ? () => setAdding(false) : undefined} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-2" />Nouvelle adresse</Button>
      )}
    </div>
  );
}
