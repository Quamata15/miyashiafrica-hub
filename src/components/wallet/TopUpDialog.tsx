import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownCircle, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startFedapayTopup } from "@/lib/fedapay";
import { paymentsByCountry } from "@/utils/paymentMethods";

interface TopUpDialogProps {
  defaultAmount?: number;
  returnPath?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000];

const TopUpDialog = ({ defaultAmount, returnPath = "/wallet", trigger, open, onOpenChange }: TopUpDialogProps) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState(defaultAmount ? String(Math.ceil(defaultAmount)) : "");
  const [country, setCountry] = useState("togo");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const value = Math.round(Number(amount));
    if (!value || value < 100) {
      toast({ title: "Montant minimum : 100 FCFA", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await startFedapayTopup({
      amount: value,
      phone,
      prefix: paymentsByCountry[country]?.prefix,
      returnPath,
    });
    if (error) {
      setLoading(false);
      toast({ title: "Paiement impossible", description: error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recharger mon portefeuille</DialogTitle>
          <DialogDescription>
            Paiement sécurisé par FedaPay : TMoney, Flooz, MTN, Moov, Orange Money, Wave ou carte bancaire.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Montant (FCFA)</Label>
            <Input type="number" inputMode="numeric" min={100} placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <Button key={a} type="button" variant="outline" size="sm" onClick={() => setAmount(String(a))}>
                  {a.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label>Pays</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentsByCountry).map(([key, c]) => (
                    <SelectItem key={key} value={key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Téléphone mobile money (facultatif)</Label>
              <Input inputMode="tel" placeholder="90 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <Button onClick={handlePay} disabled={loading} className="w-full bg-gradient-hero h-12">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownCircle className="w-4 h-4 mr-2" />}
            Payer {amount ? `${Number(amount).toLocaleString()} FCFA` : ""}
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Vous serez redirigé vers la page de paiement FedaPay, puis ramené sur MIYASHI.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog;
