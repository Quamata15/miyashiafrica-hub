import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { paymentsByCountry } from "@/utils/paymentMethods";

interface CheckoutPaymentFormProps {
  country: string;
  setCountry: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
}

const CheckoutPaymentForm = ({
  country, setCountry, paymentMethod, setPaymentMethod, phone, setPhone,
}: CheckoutPaymentFormProps) => {
  const countryData = paymentsByCountry[country];
  const methods = countryData?.methods || [];

  return (
    <Card className="border-0 shadow-elevated mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Moyen de paiement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <Label>Pays</Label>
          <Select value={country} onValueChange={(v) => {
            setCountry(v);
            setPaymentMethod(paymentsByCountry[v]?.methods[0]?.id || "card");
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(paymentsByCountry).map(([key, c]) => (
                <SelectItem key={key} value={key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value={m.id} id={`checkout-${m.id}`} />
              <label htmlFor={`checkout-${m.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                <span className="text-2xl">{m.icon}</span>
                <p className="font-medium">{m.label}</p>
              </label>
            </div>
          ))}
        </RadioGroup>

        {paymentMethod !== "card" && (
          <div className="mt-4 space-y-2">
            <Label>Numéro de téléphone</Label>
            <div className="flex gap-2">
              <Input value={countryData?.prefix || "+228"} disabled className="w-20" />
              <Input placeholder="XX XX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
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
  );
};

export default CheckoutPaymentForm;
