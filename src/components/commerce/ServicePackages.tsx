// Service page: the provider's Basic / Standard / Premium packs (order in one click, paid from
// the wallet and held in escrow) and their professional profile.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Clock, RotateCcw, ShieldCheck, Loader2, MapPin, Timer, Languages, Award, Zap, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fcfa } from "@/lib/prefs";

type Pack = { id: string; tier: "basic" | "standard" | "premium"; name: string; description: string | null; price: number; delivery_days: number; revisions: number; features: string[] };
type Pro = { headline: string | null; about: string | null; service_areas: string[]; languages: string[]; years_experience: number | null; certifications: { name: string }[]; response_hours: number; accepts_urgent: boolean; travels: boolean; travel_fee: number | null; is_available: boolean };
const ORDER = { basic: 0, standard: 1, premium: 2 };

export function ProviderProCard({ providerId }: { providerId: string }) {
  const [p, setP] = useState<Pro | null>(null);
  useEffect(() => { supabase.from("provider_profiles").select("*").eq("user_id", providerId).maybeSingle().then(({ data }) => setP(data as unknown as Pro)); }, [providerId]);
  if (!p) return null;
  return (
    <Card className="border-0 shadow-card">
      <CardHeader><CardTitle className="text-lg">Le prestataire</CardTitle>{p.headline && <p className="text-sm text-muted-foreground">{p.headline}</p>}</CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!p.is_available && <Badge variant="secondary">Indisponible pour le moment</Badge>}
        {p.about && <p className="text-muted-foreground whitespace-pre-wrap">{p.about}</p>}
        <div className="grid sm:grid-cols-2 gap-2">
          <p className="flex items-center gap-2"><Timer className="w-4 h-4 text-primary" />Répond en {p.response_hours} h en général</p>
          {p.years_experience != null && <p className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" />{p.years_experience} an(s) d'expérience</p>}
          {p.service_areas.length > 0 && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{p.service_areas.join(", ")}</p>}
          {p.languages.length > 0 && <p className="flex items-center gap-2"><Languages className="w-4 h-4 text-primary" />{p.languages.join(", ")}</p>}
          {p.accepts_urgent && <p className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Accepte les urgences</p>}
          {p.travels && <p className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" />Se déplace{p.travel_fee ? ` (${fcfa(p.travel_fee)})` : ""}</p>}
        </div>
        {p.certifications.length > 0 && <div><p className="font-medium mb-1">Diplômes et certifications</p><ul className="list-disc pl-5 text-muted-foreground">{p.certifications.map((c) => <li key={c.name}>{c.name}</li>)}</ul></div>}
      </CardContent>
    </Card>
  );
}

export default function ServicePackages({ serviceId, providerId }: { serviceId: string; providerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [chosen, setChosen] = useState<Pack | null>(null);
  const [notes, setNotes] = useState(""); const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("service_packages").select("id, tier, name, description, price, delivery_days, revisions, features").eq("service_id", serviceId).eq("is_active", true)
      .then(({ data }) => setPacks(((data ?? []) as Pack[]).sort((a, b) => ORDER[a.tier] - ORDER[b.tier])));
  }, [serviceId]);
  useEffect(() => { if (chosen && user) supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => setBalance(Number(data?.balance ?? 0))); }, [chosen, user?.id]);
  if (!packs.length) return null;

  const order = async () => {
    if (!chosen) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("order_service_package", { p_package_id: chosen.id, p_notes: notes || undefined, p_address: address || undefined });
    setBusy(false);
    if (error) return toast.error(error.message.includes("Insufficient") ? "Solde insuffisant : rechargez votre portefeuille" : error.message.replace(/^.*ERROR:\s*/, ""));
    toast.success("Commande passée : le montant est bloqué en séquestre jusqu'à la fin de la prestation");
    setChosen(null);
    navigate(`/order-success?order=${(data as { order_id: string }).order_id}`);
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader><CardTitle className="text-lg">Formules</CardTitle><p className="text-sm text-muted-foreground">Prix fixe, payé d'avance et protégé : le prestataire n'est payé qu'une fois la prestation terminée.</p></CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${packs.length === 3 ? "md:grid-cols-3" : packs.length === 2 ? "md:grid-cols-2" : ""}`}>
          {packs.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 flex flex-col ${p.tier === "standard" ? "border-primary/50 bg-primary/[0.04]" : "border-foreground/10"}`}>
              <div className="flex items-center justify-between"><p className="font-semibold">{p.name}</p>{p.tier === "standard" && <Badge>Le plus choisi</Badge>}</div>
              <p className="mt-1 font-display text-2xl font-bold">{fcfa(p.price)}</p>
              {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
              <div className="mt-3 space-y-1 text-sm">
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{p.delivery_days ? `Réalisé en ${p.delivery_days} jour(s)` : "Le jour même"}</p>
                <p className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-primary" />{p.revisions} retouche(s)</p>
                {p.features.map((f) => <p key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />{f}</p>)}
              </div>
              <Button className="mt-4" variant={p.tier === "standard" ? "default" : "outline"} disabled={user?.id === providerId} onClick={() => (user ? setChosen(p) : navigate("/auth"))}>Choisir {p.name}</Button>
            </div>
          ))}
        </div>
      </CardContent>
      <Dialog open={!!chosen} onOpenChange={(o) => !o && setChosen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Formule {chosen?.name} · {fcfa(chosen?.price ?? 0)}</DialogTitle><DialogDescription>Payé depuis votre portefeuille et bloqué en séquestre. Le prestataire est payé quand vous confirmez que le travail est fait.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Précisions pour le prestataire</Label><Textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vos besoins, dates possibles, accès…" /></div>
            <div><Label>Adresse d'intervention (si besoin)</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, repère" /></div>
            {balance !== null && chosen && (balance < chosen.price
              ? <p className="text-sm text-amber-500">Solde : {fcfa(balance)}. <Link to="/wallet" className="underline">Rechargez {fcfa(chosen.price - balance)}</Link> pour commander.</p>
              : <p className="text-sm text-muted-foreground">Solde disponible : {fcfa(balance)}</p>)}
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="w-4 h-4 text-emerald-400" />En cas de problème, ouvrez un litige : l'argent reste bloqué pendant l'examen.</p>
          </div>
          <DialogFooter><Button onClick={order} disabled={busy || (balance !== null && !!chosen && balance < chosen.price)}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Commander et payer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
