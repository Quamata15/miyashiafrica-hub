// Shop settings: address (slug), look, opening hours, quick replies, vacation, COD, store pickup, VAT (#18 #23 #24 #26).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/upload";
import { DAYS, type Hours } from "@/lib/hours";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { COUNTRY_OPTIONS } from "@/components/commerce/ProductExtras";

type Shop = Tables<"shops">;
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function ShopSettings({ shop, onSaved }: { shop: Shop | null; onSaved: (s: Shop) => void }) {
  const { user } = useAuth();
  const [f, setF] = useState<Partial<Shop>>({});
  const [replies, setReplies] = useState<string[]>([]);
  const [hours, setHours] = useState<Hours>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setF(shop ?? { name: "", slug: "", country: "TG", accepts_cod: true, vacation_mode: false });
    setReplies(((shop?.quick_replies as string[]) ?? ["Bonjour, l'article est disponible.", "Je peux livrer aujourd'hui.", "Le prix est ferme, merci."]));
    setHours((shop?.opening_hours as Hours) ?? {});
  }, [shop]);

  const set = <K extends keyof Shop>(k: K, v: Shop[K]) => setF((x) => ({ ...x, [k]: v }));
  const upload = async (k: "logo_url" | "banner_url", file?: File) => {
    if (!file || !user) return;
    try { set(k, await uploadFile("product-media", user.id, file)); } catch { toast.error("Envoi de l'image impossible"); }
  };

  const save = async () => {
    if (!user) return;
    const slug = slugify(f.slug || f.name || "");
    if (!f.name || f.name.length < 2) return toast.error("Donnez un nom à la boutique");
    if (slug.length < 3) return toast.error("Adresse trop courte (3 caractères minimum)");
    setBusy(true);
    const row = {
      owner_id: user.id, slug, name: f.name, description: f.description ?? null, logo_url: f.logo_url ?? null, banner_url: f.banner_url ?? null,
      theme_color: f.theme_color || null, country: f.country ?? "TG", city: f.city ?? null, opening_hours: hours, quick_replies: replies.filter(Boolean).slice(0, 12),
      vacation_mode: !!f.vacation_mode, vacation_message: f.vacation_message ?? null, vacation_until: f.vacation_until || null,
      accepts_cod: f.accepts_cod ?? true, store_pickup_address: f.store_pickup_address || null, vat_number: f.vat_number || null,
    };
    const { data, error } = shop
      ? await supabase.from("shops").update(row).eq("id", shop.id).select("*").single()
      : await supabase.from("shops").insert(row).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") || error.code === "23505" ? "Cette adresse est déjà prise, choisissez-en une autre" : error.message);
    toast.success("Boutique enregistrée");
    onSaved(data!);
  };

  const toggleDay = (d: keyof Hours, on: boolean) => setHours((h) => { const n = { ...h }; if (on) n[d] = [["08:00", "18:00"]]; else delete n[d]; return n; });
  const setTime = (d: keyof Hours, i: 0 | 1, v: string) => setHours((h) => ({ ...h, [d]: [[i === 0 ? v : h[d]![0][0], i === 1 ? v : h[d]![0][1]]] }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Identité</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="s-name">Nom de la boutique</Label><Input id="s-name" value={f.name ?? ""} onChange={(e) => { set("name", e.target.value); if (!shop) set("slug", slugify(e.target.value)); }} /></div>
            <div>
              <Label htmlFor="s-slug">Adresse de la boutique</Label>
              <div className="flex items-center rounded-md border border-input bg-background pl-3 text-sm"><span className="text-muted-foreground whitespace-nowrap">…/boutique/</span><input id="s-slug" className="flex-1 h-10 bg-transparent outline-none px-1 min-w-0" value={f.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
              {shop && <Link to={`/boutique/${shop.slug}`} className="text-xs text-primary inline-flex items-center gap-1 mt-1">Voir ma boutique <ExternalLink className="w-3 h-3" /></Link>}
            </div>
          </div>
          <div><Label htmlFor="s-desc">Présentation</Label><Textarea id="s-desc" rows={4} maxLength={2000} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Logo</Label>
              <label className="mt-1 flex items-center gap-3 cursor-pointer"><span className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center">{f.logo_url ? <img src={f.logo_url} alt="" className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}</span><span className="text-sm text-primary">Choisir</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload("logo_url", e.target.files?.[0])} /></label>
            </div>
            <div>
              <Label>Bannière</Label>
              <label className="mt-1 flex items-center gap-3 cursor-pointer"><span className="w-24 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center">{f.banner_url ? <img src={f.banner_url} alt="" className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}</span><span className="text-sm text-primary">Choisir</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload("banner_url", e.target.files?.[0])} /></label>
            </div>
            <div><Label htmlFor="s-color">Couleur</Label><Input id="s-color" type="color" value={f.theme_color ?? "#1a1826"} onChange={(e) => set("theme_color", e.target.value)} className="h-14 w-24 p-1" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="s-country">Pays</Label>
              <select id="s-country" value={f.country ?? "TG"} onChange={(e) => set("country", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">{COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
            <div><Label htmlFor="s-city">Ville</Label><Input id="s-city" value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Horaires d'ouverture</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map(([d, label]) => (
            <div key={d} className="flex items-center gap-3 flex-wrap">
              <Switch checked={!!hours[d]} onCheckedChange={(v) => toggleDay(d, v)} aria-label={`Ouvert le ${label}`} />
              <span className="w-24 text-sm">{label}</span>
              {hours[d] ? (<>
                <Input type="time" value={hours[d]![0][0]} onChange={(e) => setTime(d, 0, e.target.value)} className="w-32" aria-label={`Ouverture ${label}`} />
                <span>à</span>
                <Input type="time" value={hours[d]![0][1]} onChange={(e) => setTime(d, 1, e.target.value)} className="w-32" aria-label={`Fermeture ${label}`} />
              </>) : <span className="text-sm text-muted-foreground">Fermé</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Réponses rapides</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Proposées en un clic dans la messagerie.</p>
          {replies.map((r, i) => (
            <div key={i} className="flex gap-2"><Input value={r} maxLength={300} onChange={(e) => setReplies(replies.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setReplies(replies.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button></div>
          ))}
          {replies.length < 12 && <Button variant="outline" size="sm" onClick={() => setReplies([...replies, ""])}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Ventes et retrait</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4"><span><span className="font-medium block">Paiement à la livraison</span><span className="text-sm text-muted-foreground">Jusqu'à 150 000 F. Vous encaissez en espèces ; la commission de 10 % est retenue sur votre portefeuille.</span></span>
            <Switch checked={f.accepts_cod ?? true} onCheckedChange={(v) => set("accepts_cod", v)} /></label>
          <div><Label htmlFor="s-pickup">Adresse de retrait en boutique (facultatif)</Label><Input id="s-pickup" value={f.store_pickup_address ?? ""} onChange={(e) => set("store_pickup_address", e.target.value)} placeholder="Grand Marché de Lomé, allée 4, stand 12" /></div>
          <div><Label htmlFor="s-vat">Numéro fiscal / TVA (si assujetti)</Label><Input id="s-vat" value={f.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Rempli : vos factures affichent la TVA de votre pays.</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Mode vacances</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between gap-4"><span><span className="font-medium block">Mettre la boutique en pause</span><span className="text-sm text-muted-foreground">Les clients voient vos produits mais ne peuvent plus commander.</span></span>
            <Switch checked={!!f.vacation_mode} onCheckedChange={(v) => set("vacation_mode", v)} /></label>
          {f.vacation_mode && (
            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
              <Input value={f.vacation_message ?? ""} onChange={(e) => set("vacation_message", e.target.value)} placeholder="De retour lundi, merci de votre patience !" aria-label="Message de vacances" />
              <Input type="date" value={f.vacation_until ?? ""} onChange={(e) => set("vacation_until", e.target.value)} aria-label="Retour le" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button size="lg" onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{shop ? "Enregistrer" : "Créer ma boutique"}</Button></div>
    </div>
  );
}
