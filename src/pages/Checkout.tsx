import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Smartphone, Shield, Loader2, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const Checkout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const amount = parseInt(searchParams.get("amount") || "0");
  const orderId = searchParams.get("order");

  const [paymentMethod, setPaymentMethod] = useState("orange_money");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const methods = [
    { id: "orange_money", label: "Orange Money", icon: "🟠", desc: "Paiement par Orange Money" },
    { id: "wave", label: "Wave", icon: "🔵", desc: "Paiement par Wave" },
    { id: "tmoney", label: "TMoney", icon: "🟢", desc: "Paiement par TMoney (Togocel)" },
    { id: "card", label: "Carte bancaire", icon: "💳", desc: "Visa, Mastercard" },
  ];

  const handlePayment = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!phone && paymentMethod !== "card") {
      toast({ title: "Numéro requis", description: "Entrez votre numéro de téléphone", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Create payment record
    const { error: payErr } = await (supabase.from("payments") as any).insert({
      order_id: orderId,
      payer_id: user.id,
      amount,
      payment_method: paymentMethod,
      status: "completed",
      metadata: { phone },
    });

    // Create escrow transaction
    if (orderId) {
      await (supabase.from("escrow_transactions") as any).insert({
        order_id: orderId,
        payer_id: user.id,
        total_amount: amount,
        status: "held",
      });

      // Update order payment status
      await supabase.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
    }

    setLoading(false);

    if (payErr) {
      toast({ title: "Erreur de paiement", variant: "destructive" });
    } else {
      toast({ title: "Paiement réussi! ✅", description: "Vos fonds sont sécurisés dans l'escrow" });
      navigate(orderId ? `/select-driver?order=${orderId}` : "/dashboard");
    }
  };

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
                      <Input placeholder="XX XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Numéro de carte</Label>
                      <Input placeholder="XXXX XXXX XXXX XXXX" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Expiration</Label><Input placeholder="MM/AA" /></div>
                      <div className="space-y-2"><Label>CVV</Label><Input placeholder="XXX" type="password" /></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card mb-6">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-muted-foreground">Montant de la commande</span>
                  <span className="font-semibold">{amount.toLocaleString()} FCFA</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">{amount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-accent-foreground" />
                  Fonds bloqués jusqu'à validation de la réception
                </div>
              </CardContent>
            </Card>

            <Button onClick={handlePayment} disabled={loading} className="w-full h-14 text-lg bg-gradient-hero">
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              Payer {amount.toLocaleString()} FCFA
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
