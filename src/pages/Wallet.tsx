import { useEffect, useState } from "react";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import { confirmFedapayTopup, popTopupReturnPath } from "@/lib/fedapay";
import VerificationGate from "@/components/kyc/VerificationGate";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle,
  DollarSign, TrendingUp, History, Loader2, Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const paymentsByCountry: Record<string, { label: string; methods: { id: string; label: string; icon: string }[] }> = {
  togo: {
    label: "🇹🇬 Togo",
    methods: [
      { id: "tmoney", label: "TMoney (Togocel)", icon: "🟢" },
      { id: "flooz", label: "Moov Money (Flooz)", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  senegal: {
    label: "🇸🇳 Sénégal",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "wave", label: "Wave", icon: "🔵" },
      { id: "free_money", label: "Free Money", icon: "🟢" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  cote_ivoire: {
    label: "🇨🇮 Côte d'Ivoire",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "wave", label: "Wave", icon: "🔵" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  benin: {
    label: "🇧🇯 Bénin",
    methods: [
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  burkina_faso: {
    label: "🇧🇫 Burkina Faso",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  mali: {
    label: "🇲🇱 Mali",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  niger: {
    label: "🇳🇪 Niger",
    methods: [
      { id: "airtel_money", label: "Airtel Money", icon: "🔴" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  guinee: {
    label: "🇬🇳 Guinée",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
};

const WalletPage = () => {
  const { user } = useAuth();
  const { wallet, transactions, loading, requestWithdrawal, fetchWallet } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const topupId = searchParams.get("topup");

  // Back from the FedaPay payment page: confirm the top-up, then return to checkout if needed.
  useEffect(() => {
    if (!user || !topupId) return;
    let cancelled = false;
    (async () => {
      let status = "pending";
      for (let i = 0; i < 5 && status === "pending" && !cancelled; i++) {
        status = await confirmFedapayTopup(topupId);
        if (status === "pending") await new Promise((r) => setTimeout(r, 3000));
      }
      if (cancelled) return;
      setSearchParams({}, { replace: true });
      await fetchWallet();
      if (status === "approved") {
        toast({ title: "Recharge réussie ✅", description: "Votre portefeuille a été crédité." });
        const back = popTopupReturnPath();
        if (back && back !== "/wallet") navigate(back);
      } else if (status === "pending") {
        toast({ title: "Paiement en cours de confirmation", description: "Votre solde sera mis à jour dès la validation par l'opérateur." });
      } else {
        popTopupReturnPath();
        toast({ title: "Paiement non abouti", description: `Statut : ${status}`, variant: "destructive" });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, topupId]);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("togo");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 500) {
      toast({ title: "Montant minimum: 500 FCFA", variant: "destructive" });
      return;
    }
    if (!selectedMethod) {
      toast({ title: "Choisissez un moyen de paiement", variant: "destructive" });
      return;
    }
    if (!withdrawPhone && selectedMethod !== "card") {
      toast({ title: "Numéro requis", variant: "destructive" });
      return;
    }

    setWithdrawing(true);
    const success = await requestWithdrawal(amount, selectedMethod, withdrawPhone);
    setWithdrawing(false);

    if (success) {
      toast({ title: "Retrait demandé ✅", description: `${amount.toLocaleString()} FCFA seront envoyés via ${selectedMethod}` });
      setShowWithdraw(false);
      setWithdrawAmount("");
    } else {
      toast({ title: "Erreur", description: "Solde insuffisant ou erreur", variant: "destructive" });
    }
  };

  const currentMethods = paymentsByCountry[selectedCountry]?.methods || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Balance Card */}
            <Card className="border-0 shadow-elevated mb-8 overflow-hidden">
              <div className="bg-gradient-hero p-6 text-primary-foreground">
                <div className="flex items-center gap-3 mb-4">
                  <WalletIcon className="w-8 h-8" />
                  <h1 className="text-2xl font-display font-bold">Mon Portefeuille</h1>
                </div>
                <p className="text-5xl font-bold mb-2">
                  {loading ? "..." : (wallet?.balance || 0).toLocaleString()} <span className="text-2xl">FCFA</span>
                </p>
                <div className="flex gap-6 mt-4 text-sm opacity-80">
                  <div className="flex items-center gap-1">
                    <ArrowDownCircle className="w-4 h-4" />
                    Gagné: {(wallet?.total_earned || 0).toLocaleString()}F
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUpCircle className="w-4 h-4" />
                    Retiré: {(wallet?.total_withdrawn || 0).toLocaleString()}F
                  </div>
                </div>
              </div>
              <CardContent className="p-4 flex gap-3">
                <TopUpDialog
                  trigger={<Button variant="outline" className="flex-1"><ArrowDownCircle className="w-4 h-4 mr-2" /> Recharger</Button>}
                />
                <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 bg-gradient-hero"><ArrowUpCircle className="w-4 h-4 mr-2" /> Retirer</Button>
                  </DialogTrigger>
                   <DialogContent>
                    <DialogHeader><DialogTitle>Retirer des fonds</DialogTitle></DialogHeader>
                    <VerificationGate requiredFor="withdraw">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setSelectedMethod(""); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(paymentsByCountry).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Moyen de paiement</Label>
                          <div className="grid grid-cols-1 gap-2">
                            {currentMethods.map(m => (
                              <div
                                key={m.id}
                                onClick={() => setSelectedMethod(m.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                              >
                                <span className="text-xl">{m.icon}</span>
                                <span className="font-medium">{m.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {selectedMethod && selectedMethod !== "card" && (
                          <div className="space-y-2">
                            <Label>Numéro de téléphone</Label>
                            <Input placeholder="XX XX XX XX" value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Montant (FCFA)</Label>
                          <Input type="number" placeholder="5000" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                          <p className="text-xs text-muted-foreground">Solde: {(wallet?.balance || 0).toLocaleString()}F • Min: 500F</p>
                        </div>
                        <Button onClick={handleWithdraw} disabled={withdrawing} className="w-full bg-gradient-hero">
                          {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                          Confirmer le retrait
                        </Button>
                      </div>
                    </VerificationGate>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                  <DollarSign className="w-4 h-4 mr-2" /> Tableau de bord
                </Button>
              </CardContent>
            </Card>

            {/* Transactions History */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Historique</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune transaction</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          {tx.amount > 0 ? (
                            <ArrowDownCircle className="w-5 h-5 text-accent" />
                          ) : (
                            <ArrowUpCircle className="w-5 h-5 text-secondary" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                              {tx.payment_method && ` • ${tx.payment_method}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount > 0 ? "text-accent" : "text-secondary"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} F
                          </p>
                          <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;
