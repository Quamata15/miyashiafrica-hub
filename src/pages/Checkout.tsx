// Checkout: wallet, direct mobile money (#3) or cash on delivery (#4); home delivery with the
// address book (#11) and zone fees (#25), pickup point or store pickup (#26); accepted offers (#9).
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { usePrefs, fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Banknote, Lock, Loader2, MapPin, Package, PiggyBank, Shield, ShoppingBag, Smartphone, Store, Tag, Truck, Wallet } from "lucide-react";
import CheckoutPromoCode, { type AppliedPromo } from "@/components/checkout/CheckoutPromoCode";
import { AddressBook, type Address } from "@/components/commerce/AddressBook";
import { ensureGuestSession } from "@/lib/guest";
import { SavingsPlanPicker, requestSavingsPlan, type PlanChoice } from "@/components/commerce/SavingsPlan";

type Line = {
  key: string; product_id?: string; service_id?: string; variant_id?: string | null; offer_id?: string;
  quantity: number; title: string; unit: number; image?: string | null; seller_id: string; variant_label?: string | null;
};
type Zone = { id: string; base_fee: number; eta_hours: number; city: string };
type Point = { id: string; name: string; address: string; city: string; opening_hours: string | null };
type Shop = { owner_id: string; accepts_cod: boolean; store_pickup_address: string | null; name: string };

const COD_LIMIT = 150000;

export default function Checkout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { money, flag } = usePrefs();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productParam = params.get("product");
  const offerParam = params.get("offer");

  const [lines, setLines] = useState<Line[]>([]);
  const [loadingLines, setLoadingLines] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [balance, setBalance] = useState(0);
  const [fulfil, setFulfil] = useState<"delivery" | "pickup_point" | "store_pickup">("delivery");
  const [address, setAddress] = useState<Address | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [pointId, setPointId] = useState<string>("");
  const [pay, setPay] = useState<"wallet" | "mobile" | "cod" | "savings">("mobile");
  const [plan, setPlan] = useState<PlanChoice>({ plan: "installments", installments: 3, days: 90 });
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [busy, setBusy] = useState(false);

  // Build the order lines.
  useEffect(() => {
    (async () => {
      setLoadingLines(true);
      let out: Line[] = [];
      if (offerParam) {
        const { data: o } = await supabase.from("price_offers").select("id, product_id, variant_id, quantity, agreed_price, seller_id, status, product:products(title, images), variant:product_variants(label)")
          .eq("id", offerParam).maybeSingle();
        if (o && o.status === "accepted") {
          out = [{ key: o.id, offer_id: o.id, product_id: o.product_id, variant_id: o.variant_id, quantity: o.quantity, unit: Number(o.agreed_price),
            title: (o.product as any)?.title ?? "Article", image: (o.product as any)?.images?.[0], seller_id: o.seller_id, variant_label: (o.variant as any)?.label }];
        }
      } else if (productParam) {
        const qty = Math.max(1, parseInt(params.get("qty") || "1"));
        const variantId = params.get("variant");
        const [{ data: p }, { data: v }, { data: unit }] = await Promise.all([
          supabase.from("products").select("id, title, images, seller_id, price").eq("id", productParam).maybeSingle(),
          variantId ? supabase.from("product_variants").select("label").eq("id", variantId).maybeSingle() : Promise.resolve({ data: null }),
          supabase.rpc("quote_product_price", { p_product_id: productParam, p_variant_id: variantId ?? undefined, p_quantity: qty }),
        ]);
        if (p) out = [{ key: p.id, product_id: p.id, variant_id: variantId, quantity: qty, unit: Number(unit ?? p.price), title: p.title, image: p.images?.[0], seller_id: p.seller_id, variant_label: v?.label }];
      } else {
        out = await Promise.all(items.map(async (it) => {
          const d = it.product ?? it.service;
          let unit = Number(it.variant?.price ?? d?.price ?? 0);
          if (it.product_id) {
            const { data } = await supabase.rpc("quote_product_price", { p_product_id: it.product_id, p_variant_id: it.variant_id ?? undefined, p_quantity: it.quantity });
            if (data != null) unit = Number(data);
          }
          return { key: it.id, product_id: it.product_id ?? undefined, service_id: it.service_id ?? undefined, variant_id: it.variant_id, quantity: it.quantity, unit,
            title: d?.title ?? "Article", image: d?.images?.[0], variant_label: it.variant?.label,
            seller_id: (it.product as any)?.seller_id ?? (it.service as any)?.provider_id ?? "" };
        }));
        // Cart rows don't carry the seller: fetch it.
        const pids = out.filter((l) => l.product_id && !l.seller_id).map((l) => l.product_id!);
        if (pids.length) {
          const { data } = await supabase.from("products").select("id, seller_id").in("id", pids);
          const m = new Map((data ?? []).map((x) => [x.id, x.seller_id]));
          out = out.map((l) => (l.product_id && !l.seller_id ? { ...l, seller_id: m.get(l.product_id) ?? "" } : l));
        }
        const sids = out.filter((l) => l.service_id && !l.seller_id).map((l) => l.service_id!);
        if (sids.length) {
          const { data } = await supabase.from("services").select("id, provider_id").in("id", sids);
          const m = new Map((data ?? []).map((x) => [x.id, x.provider_id]));
          out = out.map((l) => (l.service_id && !l.seller_id ? { ...l, seller_id: m.get(l.service_id) ?? "" } : l));
        }
      }
      setLines(out);
      setLoadingLines(false);
      const sellerIds = [...new Set(out.map((l) => l.seller_id).filter(Boolean))];
      if (sellerIds.length) {
        const { data } = await supabase.from("shops").select("owner_id, accepts_cod, store_pickup_address, name").in("owner_id", sellerIds);
        setShops((data ?? []) as Shop[]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productParam, offerParam, items.length]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => setBalance(Number(data?.balance ?? 0)));
    supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }) => data?.phone && setPhone(data.phone));
    supabase.from("pickup_points").select("id, name, address, city, opening_hours").eq("is_active", true).order("city").then(({ data }) => setPoints(data ?? []));
  }, [user, navigate]);

  // Delivery price from the shop to this address (GPS when both have it, otherwise the city centres).
  const [dq, setDq] = useState<{ distance_km: number; price: number; precise: boolean } | null>(null);
  useEffect(() => {
    setDq(null);
    const seller = lines[0]?.seller_id;
    if (!address || !seller || new Set(lines.map((l) => l.seller_id)).size !== 1) return;
    supabase.rpc("quote_delivery", { p_seller_id: seller, p_address_id: address.id, p_vehicle: "moto" }).then(({ data }) => data && setDq(data as typeof dq));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address?.id, lines.length]);

  useEffect(() => {
    if (!address) { setZone(null); return; }
    supabase.rpc("find_delivery_zone", { p_country: address.country, p_city: address.city, p_district: address.district ?? undefined })
      .then(({ data }) => setZone(data && (data as Zone).id ? (data as Zone) : null));
  }, [address]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unit * l.quantity, 0), [lines]);
  const discount = promo ? (promo.discount_type === "percentage" ? Math.round(subtotal * promo.discount_value / 100) : Math.min(promo.discount_value, subtotal)) : 0;
  const total = Math.max(0, subtotal - discount);
  const allProducts = lines.length > 0 && lines.every((l) => l.product_id);
  const sellerIds = [...new Set(lines.map((l) => l.seller_id))];
  const singleShop = sellerIds.length === 1 ? shops.find((s) => s.owner_id === sellerIds[0]) : undefined;
  const codAllowed = flag("cash_on_delivery") && allProducts && total <= COD_LIMIT && sellerIds.every((id) => shops.find((s) => s.owner_id === id)?.accepts_cod !== false);
  const needsDelivery = lines.some((l) => l.product_id);

  // Savings: one product line (not a negotiated offer); the seller must accept and then holds the items.
  const savingsAllowed = flag("savings") && lines.length === 1 && !!lines[0].product_id && !lines[0].offer_id;
  useEffect(() => { if (pay === "cod" && !codAllowed) setPay("mobile"); }, [codAllowed, pay]);
  useEffect(() => { if (pay === "savings" && !savingsAllowed) setPay("mobile"); }, [savingsAllowed, pay]);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    const { data } = await supabase.from("promo_codes").select("*").eq("code", code).eq("is_active", true).gt("expires_at", new Date().toISOString()).maybeSingle();
    setPromoLoading(false);
    if (!data) return toast.error("Code invalide ou expiré");
    if (data.max_uses && data.used_count >= data.max_uses) return toast.error("Ce code a atteint sa limite");
    if (data.min_order_amount && subtotal < data.min_order_amount) return toast.error(`Commande minimum de ${fcfa(data.min_order_amount)}`);
    setPromo({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: data.discount_value, seller_id: data.seller_id });
    setPromoInput("");
    toast.success("Code appliqué");
  };

  const common = () => {
    const point = points.find((p) => p.id === pointId);
    return {
      fulfillment_method: fulfil,
      address_id: fulfil === "delivery" ? address?.id : undefined,
      shipping_address: fulfil === "pickup_point" ? `Point relais : ${point?.name}, ${point?.address}, ${point?.city}`
        : fulfil === "store_pickup" ? `Retrait en boutique : ${singleShop?.store_pickup_address}` : undefined,
      pickup_point_id: fulfil === "pickup_point" ? pointId : undefined,
      delivery_zone_id: fulfil === "delivery" ? zone?.id : undefined,
      notes: notes || undefined,
      promo_code: offerParam ? undefined : promo?.code,
    };
  };
  const itemPayload = (l: Line) => (l.offer_id ? { offer_id: l.offer_id } : { product_id: l.product_id, service_id: l.service_id, variant_id: l.variant_id ?? undefined, quantity: l.quantity });

  const submit = async () => {
    if (!user || !lines.length) return;
    if (needsDelivery && fulfil === "delivery" && !address) return toast.error("Choisissez ou ajoutez une adresse de livraison");
    if (fulfil === "pickup_point" && !pointId) return toast.error("Choisissez un point relais");
    if (pay === "mobile" && phone.replace(/\D/g, "").length < 8) return toast.error("Entrez le numéro mobile money qui va payer");
    setBusy(true);
    try {
      if (pay === "savings") {
        const l = lines[0];
        await requestSavingsPlan({ productId: l.product_id!, variantId: l.variant_id, quantity: l.quantity, choice: plan, addressId: fulfil === "delivery" ? address?.id : null });
        if (!productParam) await clearCart();
        toast.success("Demande d'épargne envoyée au vendeur. Vous serez prévenu dès sa réponse.");
        navigate("/savings");
        return;
      }
      if (pay === "mobile") {
        const { data: ck, error } = await supabase.rpc("create_pending_checkout", { p_items: lines.map(itemPayload), p_common: common() });
        if (error) throw error;
        const { data, error: fnErr } = await supabase.functions.invoke("fedapay-checkout", { body: { checkout_id: (ck as any).checkout_id, phone } });
        if (fnErr || !data?.payment_url) throw new Error(data?.error ?? "Le paiement mobile money n'a pas pu démarrer. Réessayez ou payez avec le portefeuille.");
        window.location.assign(data.payment_url);
        return;
      }
      if (pay === "wallet" && balance < total) throw new Error("Solde du portefeuille insuffisant : choisissez Mobile money");
      const orders: string[] = [];
      for (const [i, l] of lines.entries()) {
        const p = { ...common(), ...itemPayload(l), payment_mode: pay === "cod" ? "cod" : "wallet" } as Record<string, unknown>;
        if (i > 0) delete p.promo_code;
        const { data, error } = await supabase.rpc("place_order", { p: p as any });
        if (error) throw error;
        orders.push((data as any).order_id);
      }
      if (!productParam && !offerParam) await clearCart();
      toast.success(pay === "cod" ? "Commande confirmée : vous paierez à la livraison" : "Paiement réussi, fonds sécurisés en séquestre");
      // Home delivery: choose the driver right away (for cash on delivery, the driver must accept to collect).
      if (needsDelivery && fulfil === "delivery" && orders.length === 1) navigate(`/select-driver?order=${orders[0]}`);
      else navigate(`/order-success?order=${orders[orders.length - 1]}&total=${total}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-header pb-10 flex items-center justify-center px-4">
          <Card className="max-w-md w-full"><CardContent className="p-6 space-y-4 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-xl font-display font-bold">Comment voulez-vous commander ?</h1>
            <p className="text-sm text-muted-foreground">Sans compte, vous commandez tout de suite ; votre commande reste protégée par le séquestre et le code de remise. Vous pourrez créer votre compte ensuite sans rien perdre.</p>
            <div className="grid gap-2">
              <Button onClick={async () => { setBusy(true); const id = await ensureGuestSession(); setBusy(false); if (!id) toast.error("Impossible pour le moment, réessayez"); }} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Commander sans compte
              </Button>
              <Button variant="outline" onClick={() => navigate(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>Se connecter ou créer un compte</Button>
            </div>
          </CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!loadingLines && !lines.length) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-header pb-10 flex items-center justify-center px-4">
          <Card className="max-w-md text-center"><CardContent className="p-8">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-display font-bold mb-2">Rien à payer</h1>
            <p className="text-muted-foreground mb-6">Votre panier est vide ou l'offre n'est plus valable.</p>
            <Button onClick={() => navigate("/marketplace")}>Voir les produits</Button>
          </CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  const option = (value: string, icon: React.ReactNode, title: string, desc: string, disabled = false) => (
    <label htmlFor={`opt-${value}`} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${disabled ? "opacity-50" : "cursor-pointer"} ${(pay === value || fulfil === value) ? "border-primary bg-primary/5" : "border-border"}`}>
      <RadioGroupItem value={value} id={`opt-${value}`} disabled={disabled} className="mt-1" />
      <span className="text-primary mt-0.5">{icon}</span>
      <span className="flex-1"><span className="font-medium block">{title}</span><span className="text-sm text-muted-foreground">{desc}</span></span>
    </label>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/15 flex items-center justify-center"><Lock className="w-7 h-7 text-primary" /></div>
            <h1 className="text-3xl font-display font-bold">Paiement sécurisé</h1>
            <p className="text-muted-foreground mt-1">L'argent reste bloqué jusqu'à ce que vous confirmiez la réception.</p>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShoppingBag className="w-5 h-5" />Votre commande</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loadingLines ? <Loader2 className="w-5 h-5 animate-spin" /> : lines.map((l) => (
                <div key={l.key} className="flex items-center gap-3 text-sm">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">{l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-3.5 text-muted-foreground" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">{l.title}</p>
                    <p className="text-muted-foreground">{l.variant_label ? `${l.variant_label} · ` : ""}{l.quantity} × {fcfa(l.unit)}{l.offer_id ? " · prix négocié" : ""}</p>
                  </div>
                  <span className="font-semibold">{fcfa(l.unit * l.quantity)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {!offerParam && <CheckoutPromoCode promoInput={promoInput} setPromoInput={setPromoInput} promoLoading={promoLoading} appliedPromo={promo} onApply={applyPromo} onRemove={() => setPromo(null)} />}

          {needsDelivery && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Truck className="w-5 h-5" />Réception</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={fulfil} onValueChange={(v) => setFulfil(v as typeof fulfil)} className="space-y-2">
                  {option("delivery", <Truck className="w-5 h-5" />, "Livraison à domicile", zone ? `Estimation ${fcfa(zone.base_fee)} à ${zone.city}, sous ${zone.eta_hours} h environ. Le prix exact est fixé avec le livreur.` : "Le prix est fixé avec le livreur choisi (550 F/km).")}
                  {option("pickup_point", <MapPin className="w-5 h-5" />, "Point relais", points.length ? `${points.length} point${points.length > 1 ? "s" : ""} disponible${points.length > 1 ? "s" : ""}` : "Aucun point relais ouvert pour l'instant", !points.length)}
                  {singleShop?.store_pickup_address && option("store_pickup", <Store className="w-5 h-5" />, "Retrait en boutique", `${singleShop.name} : ${singleShop.store_pickup_address}`)}
                </RadioGroup>
                {fulfil === "delivery" && <AddressBook selectable value={address?.id} onSelect={setAddress} />}
                {fulfil === "pickup_point" && (
                  <RadioGroup value={pointId} onValueChange={setPointId} className="space-y-2">
                    {points.map((p) => (
                      <label key={p.id} htmlFor={`pp-${p.id}`} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${pointId === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                        <RadioGroupItem value={p.id} id={`pp-${p.id}`} className="mt-1" />
                        <span><span className="font-medium block">{p.name} — {p.city}</span><span className="text-sm text-muted-foreground">{p.address}{p.opening_hours ? ` · ${p.opening_hours}` : ""}</span></span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
                <p className="text-xs text-muted-foreground">À la remise, donnez votre code à 6 chiffres (visible dans vos commandes) : c'est la preuve de réception.</p>
                <div><Label htmlFor="notes">Instructions (facultatif)</Label><Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Appeler avant de passer…" /></div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="w-5 h-5" />Paiement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={pay} onValueChange={(v) => setPay(v as typeof pay)} className="space-y-2">
                {flag("direct_mobile_money") && option("mobile", <Smartphone className="w-5 h-5" />, "Mobile money", "TMoney, Flooz, MTN, Moov, Orange, Wave ou carte, en une fois via FedaPay")}
                {option("wallet", <Wallet className="w-5 h-5" />, "Portefeuille MIYASHI", `Solde : ${fcfa(balance)}${balance < total ? " (insuffisant)" : ""}`, balance < total)}
                {savingsAllowed && option("savings", <PiggyBank className="w-5 h-5" />, "Épargne : payer en plusieurs fois",
                  "Petits dépôts libres ou 2 à 5 tranches. Le vendeur accepte et réserve l'article pour vous, ou refuse.")}
                {flag("cash_on_delivery") && option("cod", <Banknote className="w-5 h-5" />, "Paiement à la livraison",
                  codAllowed ? "Rien à payer maintenant. Vous choisissez ensuite le livreur ; s'il accepte la course en espèces, vous payez à la remise contre votre code" : allProducts ? `Non disponible pour cette commande (vendeur ou montant > ${fcfa(COD_LIMIT)})` : "Réservé aux produits", !codAllowed)}
              </RadioGroup>
              {pay === "savings" && <SavingsPlanPicker total={total} value={plan} onChange={setPlan} />}
              {pay === "mobile" && (
                <div><Label htmlFor="mm-phone">Numéro mobile money</Label><Input id="mm-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90 00 00 00" /></div>
              )}
              {balance < total && pay === "wallet" && <Link to="/wallet" className="text-sm text-primary underline">Recharger le portefeuille</Link>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{fcfa(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-accent"><span className="flex items-center gap-1"><Tag className="w-3 h-3" />{promo?.code}</span><span>-{fcfa(discount)}</span></div>}
              {needsDelivery && fulfil === "delivery" && <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Livraison</span><span className="text-right text-muted-foreground">{dq ? `${fcfa(dq.price)} en moto · ${dq.distance_km} km${dq.precise ? "" : " (estimation par ville)"}` : zone ? `≈ ${fcfa(zone.base_fee)}` : "calculée au choix du livreur"}</span></div>}
              <Separator />
              <div className="flex justify-between items-end"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-primary">{money(total)}</span></div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground pt-1"><Shield className="w-4 h-4 text-accent" />{pay === "cod" ? "Vous ne payez qu'à la remise du colis." : "Fonds bloqués en séquestre jusqu'à votre confirmation de réception."}</p>
            </CardContent>
          </Card>

          <Button onClick={submit} disabled={busy || loadingLines} className="w-full h-14 text-lg">
            {busy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {pay === "savings" ? "Envoyer la demande d'épargne au vendeur" : pay === "cod" ? `Confirmer la commande (${fcfa(total)})` : pay === "mobile" ? `Payer ${fcfa(total)} par mobile money` : `Payer ${fcfa(total)}`}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
