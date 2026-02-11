import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Smartphone, Shield, Loader2, Lock, CheckCircle, MapPin, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

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

  // Support direct order via query params OR cart
  const directAmount = parseInt(searchParams.get("amount") || "0");
  const directOrderId = searchParams.get("order");
  const directProductId = searchParams.get("product");
  const directSellerId = searchParams.get("seller");
  const directQty = parseInt(searchParams.get("qty") || "1");

  const [paymentMethod, setPaymentMethod] = useState("orange_money");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isDirectOrder = !!directAmount && !!directSellerId;
  const checkoutAmount = isDirectOrder ? directAmount : totalPrice;
  const hasItems = isDirectOrder || items.length > 0;

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const methods = [
    { id: "orange_money", label: "Orange Money", icon: "🟠", desc: "Paiement par Orange Money" },
    { id: "wave", label: "Wave", icon: "🔵", desc: "Paiement par Wave" },
    { id: "tmoney", label: "TMoney", icon: "🟢", desc: "Paiement par TMoney (Togocel)" },
    { id: "card", label: "Carte bancaire", icon: "💳", desc: "Visa, Mastercard" },
  ];

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
      // Build order items
      let orderItems: OrderItem[] = [];

      if (isDirectOrder) {
        orderItems = [{
          productId: directProductId || undefined,
          sellerId: directSellerId!,
          title: "Commande directe",
          price: directAmount,
          quantity: directQty,
        }];
      } else {
        orderItems = items.map(item => {
          const data = item.product || item.service;
          return {
            productId: item.product_id || undefined,
            serviceId: item.service_id || undefined,
            sellerId: (item.product as any)?.seller_id || (item.service as any)?.provider_id || user.id,
            title: data?.title || "Article",
            price: data?.price || 0,
            quantity: item.quantity,
          };
        });
      }

      // Create orders for each item/seller
      for (const orderItem of orderItems) {
        const totalItemPrice = orderItem.price * orderItem.quantity;

        // 1. Create order
        const { data: order, error: orderErr } = await supabase.from("orders").insert({
          buyer_id: user.id,
          seller_id: orderItem.sellerId,
          product_id: orderItem.productId || null,
          service_id: orderItem.serviceId || null,
          quantity: orderItem.quantity,
          total_price: totalItemPrice,
          status: "pending",
          payment_status: "paid",
          shipping_address: shippingAddress,
          notes: notes || null,
        }).select("id").single();

        if (orderErr || !order) throw orderErr;

        // 2. Create payment record
        await (supabase.from("payments") as any).insert({
          order_id: order.id,
          payer_id: user.id,
          amount: totalItemPrice,
          payment_method: paymentMethod,
          status: "completed",
          metadata: { phone },
        });

        // 3. Create escrow (funds held until delivery confirmed)
        await (supabase.from("escrow_transactions") as any).insert({
          order_id: order.id,
          payer_id: user.id,
          total_amount: totalItemPrice,
          seller_amount: totalItemPrice * 0.9,
          platform_commission: totalItemPrice * 0.1,
          status: "held",
        });
      }

      // Clear cart if using cart checkout
      if (!isDirectOrder) {
        await clearCart();
      }

      setLoading(false);
      toast({ title: "Paiement réussi! ✅", description: "Vos fonds sont sécurisés. Choisissez un livreur." });

      // Navigate to driver selection for last order
      navigate("/select-driver?order=latest");

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
              <Button onClick={() => navigate("/marketplace")} className="bg-gradient-hero">
                Voir les produits
              </Button>
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

            {/* Order Summary */}
            {!isDirectOrder && items.length > 0 && (
              <Card className="border-0 shadow-card mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" /> Récapitulatif ({items.length} articles)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map(item => {
                    const data = item.product || item.service;
                    if (!data) return null;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                            {data.images?.[0] ? (
                              <img src={data.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{data.title}</p>
                            <p className="text-muted-foreground">x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-semibold">{((data.price || 0) * item.quantity).toLocaleString()} F</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Shipping Address */}
            <Card className="border-0 shadow-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Adresse complète</Label>
                  <Input
                    placeholder="Quartier, rue, repère..."
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    placeholder="Instructions spéciales pour la livraison..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-0 shadow-elevated mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Moyen de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {methods.map(m => (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value={m.id} id={m.id} />
                      <label htmlFor={m.id} className="flex items-center gap-3 cursor-pointer flex-1">
                        <span className="text-2xl">{m.icon}</span>
                        <div>
                          <p className="font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>

                {paymentMethod !== "card" && (
                  <div className="mt-4 space-y-2">
                    <Label>Numéro de téléphone</Label>
                    <div className="flex gap-2">
                      <Input value="+228" disabled className="w-20" />
                      <Input placeholder="XX XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} className="h-12" />
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Numéro de carte</Label>
                      <Input placeholder="XXXX XXXX XXXX XXXX" className="h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Expiration</Label><Input placeholder="MM/AA" /></div>
                      <div className="space-y-2"><Label>CVV</Label><Input placeholder="XXX" type="password" /></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-0 shadow-card mb-6">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-semibold">{checkoutAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span className="text-sm text-muted-foreground">Calculés après sélection du livreur</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">{checkoutAmount.toLocaleString()} FCFA</span>
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
