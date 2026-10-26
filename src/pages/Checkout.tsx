import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Shield, Loader2, Lock, CheckCircle, MapPin, ShoppingBag, Tag } from "lucide-react";
import { motion } from "framer-motion";
import CheckoutOrderSummary from "@/components/checkout/CheckoutOrderSummary";
import CheckoutPromoCode, { type AppliedPromo } from "@/components/checkout/CheckoutPromoCode";
import CheckoutPaymentForm from "@/components/checkout/CheckoutPaymentForm";

interface OrderItem {
  productId?: string;
  serviceId?: string;
  sellerId: string;
  title: string;
  price: number;
  quantity: number;
}

const Checkout = () => {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const directAmount = parseInt(searchParams.get("amount") || "0");
  const directProductId = searchParams.get("product");
  const directSellerId = searchParams.get("seller");
  const directQty = parseInt(searchParams.get("qty") || "1");

  const [country, setCountry] = useState("togo");
  const [paymentMethod, setPaymentMethod] = useState("tmoney");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const isDirectOrder = !!directAmount && !!directSellerId;
  const baseAmount = isDirectOrder ? directAmount : totalPrice;
  const hasItems = isDirectOrder || items.length > 0;

  const discount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round(baseAmount * appliedPromo.discount_value / 100)
      : Math.min(appliedPromo.discount_value, baseAmount)
    : 0;
  const checkoutAmount = baseAmount - discount;

  useEffect(() => { if (!user) navigate("/auth"); }, [user, navigate]);

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);

    const { data, error } = await supabase.from("promo_codes")
      .select("*").eq("code", code).eq("is_active", true)
      .gt("expires_at", new Date().toISOString()).maybeSingle();

    setPromoLoading(false);

    if (error || !data) {
      toast({ title: "Code invalide", description: "Ce code promo n'existe pas ou a expiré", variant: "destructive" });
      return;
    }
    if (data.max_uses && data.used_count >= data.max_uses) {
      toast({ title: "Code expiré", description: "Ce code promo a atteint sa limite d'utilisation", variant: "destructive" });
      return;
    }
    if (data.min_order_amount && baseAmount < data.min_order_amount) {
      toast({ title: "Montant minimum requis", description: `Commande minimum de ${Number(data.min_order_amount).toLocaleString()} FCFA`, variant: "destructive" });
      return;
    }

    setAppliedPromo({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: data.discount_value, seller_id: data.seller_id });
    setPromoInput("");
    toast({ title: "Code appliqué! 🎉", description: `Réduction de ${data.discount_type === "percentage" ? `${data.discount_value}%` : `${Number(data.discount_value).toLocaleString()}F`}` });
  };

  const handlePayment = async () => {
    if (!user) return;
    if (!phone && paymentMethod !== "card") {
      toast({ title: "Numéro requis", description: "Entrez votre numéro de téléphone", variant: "destructive" });
      return;
    }
    if (!shippingAddress.trim()) {
      toast({ title: "Adresse requise", description: "Entrez votre adresse de livraison", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let orderItems: OrderItem[] = [];
      if (isDirectOrder) {
        orderItems = [{ productId: directProductId || undefined, sellerId: directSellerId!, title: "Commande directe", price: directAmount, quantity: directQty }];
      } else {
        orderItems = items.map(item => {
          const data = item.product || item.service;
          return {
            productId: item.product_id || undefined,
            serviceId: item.service_id || undefined,
            sellerId: (item.product as unknown as { seller_id: string } | null)?.seller_id || (item.service as unknown as { provider_id: string } | null)?.provider_id || user.id,
            title: data?.title || "Article",
            price: data?.price || 0,
            quantity: item.quantity,
          };
        });
      }

      let lastOrderId = "";
      let lastTotal = 0;

      for (const orderItem of orderItems) {
        const { data: result, error: rpcErr } = await supabase.rpc("create_secure_order", {
          p_product_id: orderItem.productId || null,
          p_service_id: orderItem.serviceId || null,
          p_quantity: orderItem.quantity,
          p_shipping_address: shippingAddress,
          p_notes: notes || null,
          p_payment_method: paymentMethod,
          p_phone: phone || null,
          p_promo_code: appliedPromo?.code || null,
        });
        if (rpcErr) throw new Error(rpcErr.message.includes("Insufficient wallet") ? "Solde du portefeuille insuffisant pour payer cette commande" : rpcErr.message);
        const res = result as Record<string, unknown> | null;
        if (!res?.success) throw new Error((res?.error as string) || "Erreur lors de la création de la commande");
        lastOrderId = res.order_id as string;
        lastTotal = res.total_price as number;
      }

      if (!isDirectOrder) await clearCart();
      setLoading(false);
      toast({ title: "Paiement réussi! ✅", description: "Vos fonds sont sécurisés." });
      navigate(`/order-success?order=${lastOrderId}&total=${lastTotal}`);
    } catch (error: any) {
      setLoading(false);
      toast({ title: "Erreur de paiement", description: error?.message || "Une erreur est survenue", variant: "destructive" });
    }
  };

  if (!hasItems) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <Card className="max-w-md border-0 shadow-elevated text-center">
            <CardContent className="p-8">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-display font-bold mb-2">Panier vide</h2>
              <p className="text-muted-foreground mb-6">Ajoutez des articles avant de passer commande</p>
              <Button onClick={() => navigate("/marketplace")} className="bg-gradient-hero">Voir les produits</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-hero flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold">Paiement Sécurisé</h1>
              <p className="text-muted-foreground mt-2">Vos fonds sont protégés par notre système d'escrow</p>
            </div>

            {!isDirectOrder && <CheckoutOrderSummary items={items} />}

            <CheckoutPromoCode
              promoInput={promoInput} setPromoInput={setPromoInput}
              promoLoading={promoLoading} appliedPromo={appliedPromo}
              onApply={applyPromoCode} onRemove={() => setAppliedPromo(null)}
            />

            {/* Shipping Address */}
            <Card className="border-0 shadow-card mb-6">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-5 h-5" />
                  <span className="font-semibold">Adresse de livraison</span>
                </div>
                <div className="space-y-2">
                  <Label>Adresse complète</Label>
                  <Input placeholder="Quartier, rue, repère..." value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea placeholder="Instructions spéciales pour la livraison..." value={notes}
                    onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>

            <CheckoutPaymentForm
              country={country} setCountry={setCountry}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              phone={phone} setPhone={setPhone}
            />

            {/* Total */}
            <Card className="border-0 shadow-card mb-6">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-semibold">{baseAmount.toLocaleString()} FCFA</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-accent-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Réduction ({appliedPromo?.code})
                    </span>
                    <span className="font-semibold text-accent-foreground">-{discount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span className="text-sm text-muted-foreground">Calculés après sélection du livreur</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <div className="text-right">
                    {discount > 0 && (
                      <span className="text-sm text-muted-foreground line-through block">{baseAmount.toLocaleString()} FCFA</span>
                    )}
                    <span className="font-bold text-2xl text-primary">{checkoutAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-accent-foreground" />
                  Fonds bloqués en escrow jusqu'à validation de la réception
                </div>
              </CardContent>
            </Card>

            <Button onClick={handlePayment} disabled={loading} className="w-full h-14 text-lg bg-gradient-hero">
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              Payer {checkoutAmount.toLocaleString()} FCFA
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
