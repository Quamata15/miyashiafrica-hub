// Product page building blocks: variants (#10), wholesale tiers (#21), offers (#9), group buy (#13),
// savings (#7), back-in-stock alert (#12), customs estimate (#30), sharing (#36), comparison (#14).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrefs, fcfa } from "@/lib/prefs";
import { compareList } from "@/lib/local-lists";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BellRing, Check, Copy, GitCompare, HandCoins, Loader2, PiggyBank, Plane, Share2, Users } from "lucide-react";

export type Variant = { id: string; label: string; options: Record<string, string>; price: number | null; stock: number; is_active: boolean };
export type Tier = { min_qty: number; unit_price: number };

/** Unit price for a quantity, applying the variant price and the best wholesale tier. */
export function unitPrice(base: number, variant: Variant | null, tiers: Tier[], qty: number) {
  const list = variant?.price ?? base;
  const tier = tiers.filter((t) => t.min_qty <= qty).sort((a, b) => a.unit_price - b.unit_price)[0];
  return tier ? Math.min(list, tier.unit_price) : list;
}

export function VariantPicker({ variants, value, onChange }: { variants: Variant[]; value: Variant | null; onChange: (v: Variant) => void }) {
  const { money } = usePrefs();
  if (!variants.length) return null;
  return (
    <div>
      <p className="font-medium mb-2">Choisissez une variante</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variantes">
        {variants.map((v) => (
          <button
            key={v.id} type="button" role="radio" aria-checked={value?.id === v.id} disabled={v.stock <= 0}
            onClick={() => onChange(v)}
            className={`px-3 py-2 rounded-xl border text-sm text-left transition-colors disabled:opacity-40 disabled:line-through ${
              value?.id === v.id ? "border-primary bg-primary/10" : "border-foreground/15 hover:border-primary/50"}`}
          >
            <span className="font-medium block">{v.label}</span>
            <span className="text-xs text-muted-foreground">{v.price != null ? money(v.price, { withEquivalent: false }) : ""}{v.stock <= 0 ? " · épuisé" : v.stock <= 5 ? ` · ${v.stock} restants` : ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TierTable({ tiers, minQty }: { tiers: Tier[]; minQty: number }) {
  if (!tiers.length && minQty <= 1) return null;
  return (
    <div className="rounded-xl border border-foreground/10 p-3 text-sm">
      <p className="font-medium mb-1">Prix de gros</p>
      {minQty > 1 && <p className="text-muted-foreground mb-1">Commande minimum : {minQty} pièces</p>}
      <ul className="space-y-0.5">
        {tiers.sort((a, b) => a.min_qty - b.min_qty).map((t) => (
          <li key={t.min_qty} className="flex justify-between"><span>À partir de {t.min_qty} pièces</span><span className="font-semibold">{fcfa(t.unit_price)} / pièce</span></li>
        ))}
      </ul>
    </div>
  );
}

function requireLogin(user: unknown, navigate: (p: string) => void) {
  if (user) return true;
  toast.error("Connectez-vous pour continuer");
  navigate("/auth");
  return false;
}

export function MakeOfferDialog({ productId, listPrice, variant, quantity }: { productId: string; listPrice: number; variant: Variant | null; quantity: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("make_offer", {
      p_product_id: productId, p_price: Number(price), p_quantity: quantity, p_variant_id: variant?.id ?? undefined, p_message: message || undefined,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Offre envoyée au vendeur. Vous serez notifié de sa réponse.");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? requireLogin(user, navigate) && setOpen(true) : setOpen(false))}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-xl"><HandCoins className="w-5 h-5 mr-2" />Faire une offre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proposer un prix</DialogTitle>
          <DialogDescription>Prix affiché : {fcfa(listPrice)}{variant ? ` (${variant.label})` : ""}. Le vendeur peut accepter, refuser ou faire une contre-offre. Une offre acceptée est valable 48 h.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="offer-price">Votre prix par pièce (FCFA)</Label>
            <Input id="offer-price" type="number" inputMode="numeric" min={Math.ceil(listPrice * 0.3)} max={listPrice - 1} value={price} onChange={(e) => setPrice(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Entre {fcfa(Math.ceil(listPrice * 0.3))} et {fcfa(listPrice - 1)}. Quantité : {quantity}.</p>
          </div>
          <div>
            <Label htmlFor="offer-msg">Message (facultatif)</Label>
            <Textarea id="offer-msg" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Je prends 2 pièces si…" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !price}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Envoyer l'offre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GroupBuy = { id: string; group_price: number; target_qty: number; current_qty: number; deadline: string; status: string; variant_id: string | null };

export function GroupBuyCard({ productId, listPrice, isSeller }: { productId: string; listPrice: number; isSeller: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [g, setG] = useState<GroupBuy | null>(null);
  const [joined, setJoined] = useState(false);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("group_buys").select("*").eq("product_id", productId).eq("status", "open").maybeSingle();
    setG(data as GroupBuy | null);
    if (data && user) {
      const { data: p } = await supabase.from("group_buy_participants").select("id").eq("group_buy_id", data.id).eq("user_id", user.id).maybeSingle();
      setJoined(!!p);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId, user?.id]);
  if (!g) return isSeller ? <CreateGroupBuy productId={productId} listPrice={listPrice} onCreated={load} /> : null;

  const pct = Math.min(100, Math.round((g.current_qty / g.target_qty) * 100));
  const left = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86_400_000));
  const join = async () => {
    if (!requireLogin(user, navigate)) return;
    setBusy(true);
    const { error } = await supabase.rpc("join_group_buy", { p_id: g.id, p_quantity: qty });
    setBusy(false);
    if (error) return toast.error(errMsg(error), errMsg(error).includes("Solde") ? { action: { label: "Recharger", onClick: () => navigate("/wallet") } } : undefined);
    toast.success("Vous participez ! Le montant est bloqué et remboursé si l'objectif n'est pas atteint.");
    load();
  };
  const leave = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("leave_group_buy", { p_id: g.id });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Participation annulée, montant remboursé.");
    load();
  };
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-accent" />Achat groupé</p>
        <Badge variant="outline">{left > 0 ? `${left} j restants` : "se termine aujourd'hui"}</Badge>
      </div>
      <p className="text-sm"><span className="text-2xl font-bold text-accent">{fcfa(g.group_price)}</span> <span className="text-muted-foreground line-through ml-1">{fcfa(listPrice)}</span> par pièce si {g.target_qty} pièces sont réservées.</p>
      <Progress value={pct} aria-label="Progression de l'achat groupé" />
      <p className="text-xs text-muted-foreground">{g.current_qty} / {g.target_qty} réservées. Votre argent est bloqué et rendu automatiquement si l'objectif n'est pas atteint.</p>
      {!isSeller && (joined ? (
        <Button variant="outline" size="sm" onClick={leave} disabled={busy}>Quitter l'achat groupé</Button>
      ) : (
        <div className="flex gap-2">
          <Input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-20" aria-label="Quantité" />
          <Button onClick={join} disabled={busy} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Rejoindre ({fcfa(g.group_price * qty)})</Button>
        </div>
      ))}
    </div>
  );
}

function CreateGroupBuy({ productId, listPrice, onCreated }: { productId: string; listPrice: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(Math.round(listPrice * 0.85)));
  const [target, setTarget] = useState("10");
  const [days, setDays] = useState("7");
  const create = async () => {
    const { error } = await supabase.rpc("create_group_buy", { p_product_id: productId, p_group_price: Number(price), p_target_qty: Number(target), p_days: Number(days) });
    if (error) return toast.error(errMsg(error));
    toast.success("Achat groupé lancé");
    setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Users className="w-4 h-4 mr-2" />Lancer un achat groupé</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Lancer un achat groupé</DialogTitle><DialogDescription>Les acheteurs réservent au prix de groupe. Si l'objectif est atteint avant la date limite, toutes les commandes sont passées ; sinon chacun est remboursé.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Prix groupé</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><Label>Objectif (pièces)</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div><Label>Durée (jours)</Label><Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={create}>Lancer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SavingsButton({ productId, variant, quantity }: { productId: string; variant: Variant | null; quantity: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const start = async () => {
    if (!requireLogin(user, navigate)) return;
    const { error } = await supabase.rpc("create_savings_goal", { p_product_id: productId, p_quantity: quantity, p_variant_id: variant?.id ?? undefined });
    if (error) return toast.error(errMsg(error));
    toast.success("Objectif d'épargne créé. Versez quand vous voulez : la commande part dès que le montant est atteint.");
    navigate("/savings");
  };
  return <Button variant="ghost" size="sm" onClick={start}><PiggyBank className="w-4 h-4 mr-2" />Payer en plusieurs fois (épargne)</Button>;
}

export function StockAlertButton({ productId, variantId }: { productId: string; variantId?: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const subscribe = async () => {
    if (!requireLogin(user, navigate)) return;
    const { error } = await supabase.from("stock_alerts").insert({ user_id: user!.id, product_id: productId, variant_id: variantId ?? null });
    if (error && !error.message.includes("duplicate")) return toast.error("Impossible d'activer l'alerte");
    setDone(true);
    toast.success("Nous vous préviendrons dès le retour en stock.");
  };
  return (
    <Button variant="secondary" size="lg" className="rounded-xl" onClick={subscribe} disabled={done}>
      {done ? <Check className="w-5 h-5 mr-2" /> : <BellRing className="w-5 h-5 mr-2" />}{done ? "Alerte activée" : "Me prévenir du retour en stock"}
    </Button>
  );
}

const COUNTRIES: Record<string, string> = { TG: "Togo", BJ: "Bénin", CI: "Côte d'Ivoire", SN: "Sénégal", BF: "Burkina Faso", ML: "Mali", NE: "Niger", GN: "Guinée", GH: "Ghana", NG: "Nigeria", GW: "Guinée-Bissau" };
export const COUNTRY_OPTIONS = Object.entries(COUNTRIES);

export function CustomsEstimate({ from, amount }: { from: string; amount: number }) {
  const [to, setTo] = useState(() => { try { return localStorage.getItem("miyashi_country") || from; } catch { return from; } });
  const [res, setRes] = useState<{ cross_border: boolean; known?: boolean; duty?: number; vat?: number; total?: number; note?: string } | null>(null);
  useEffect(() => {
    try { localStorage.setItem("miyashi_country", to); } catch { /* ignore */ }
    supabase.rpc("estimate_customs", { p_from: from, p_to: to, p_amount: amount }).then(({ data }) => setRes(data as typeof res));
  }, [from, to, amount]);
  return (
    <div className="rounded-xl border border-foreground/10 p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Plane className="w-4 h-4 text-primary" />
        <span>Expédié depuis {COUNTRIES[from] ?? from} vers</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent border border-foreground/15 rounded-lg px-2 py-1" aria-label="Pays de livraison">
          {COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c} className="bg-background">{n}</option>)}
        </select>
      </div>
      {res?.cross_border && res.known && (
        <p className="text-muted-foreground">
          Frais de douane estimés : <strong className="text-foreground">{fcfa(res.total)}</strong> (droits {fcfa(res.duty)} + TVA {fcfa(res.vat)}). <span className="block text-xs mt-1">{res.note} Estimation indicative, le montant réel est fixé par la douane.</span>
        </p>
      )}
      {res?.cross_border && res.known === false && <p className="text-muted-foreground">Livraison internationale : frais de douane à confirmer avec le vendeur.</p>}
    </div>
  );
}

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const text = `${title} sur MIYASHI : ${url}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, text: title, url }); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
  };
  return (
    <div className="flex items-center gap-2">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>
        WhatsApp
      </a>
      <Button variant="ghost" size="sm" onClick={share}><Share2 className="w-4 h-4 mr-1" />Partager</Button>
      <Button variant="ghost" size="icon" aria-label="Copier le lien" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }}><Copy className="w-4 h-4" /></Button>
    </div>
  );
}

export function CompareToggle({ productId }: { productId: string }) {
  const [on, setOn] = useState(compareList.has(productId));
  useEffect(() => {
    const h = () => setOn(compareList.has(productId));
    window.addEventListener(`miyashi:${compareList.key}`, h);
    return () => window.removeEventListener(`miyashi:${compareList.key}`, h);
  }, [productId]);
  const toggle = () => {
    const r = compareList.toggle(productId);
    if (r === null) toast.error("Vous comparez déjà 4 produits", { action: { label: "Voir", onClick: () => (window.location.href = "/compare") } });
    else if (r) toast.success("Ajouté au comparateur", { action: { label: "Comparer", onClick: () => (window.location.href = "/compare") } });
  };
  return <Button variant="ghost" size="sm" onClick={toggle} aria-pressed={on}><GitCompare className="w-4 h-4 mr-1" />{on ? "Dans le comparateur" : "Comparer"}</Button>;
}

export function VacationBanner({ shop }: { shop: { vacation_mode: boolean; vacation_message: string | null; vacation_until: string | null; name: string } | null }) {
  if (!shop?.vacation_mode || (shop.vacation_until && shop.vacation_until < new Date().toISOString().slice(0, 10))) return null;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
      <strong>{shop.name} est en congé</strong>{shop.vacation_until ? ` jusqu'au ${new Date(shop.vacation_until).toLocaleDateString("fr-FR")}` : ""}. {shop.vacation_message ?? "Les commandes reprendront à son retour."}
    </div>
  );
}

export function ShopLink({ shop }: { shop: { slug: string; name: string } | null }) {
  if (!shop) return null;
  return <Link to={`/boutique/${shop.slug}`} className="text-sm text-primary hover:underline">Voir la boutique {shop.name}</Link>;
}
