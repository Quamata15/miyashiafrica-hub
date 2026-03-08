import { Shield, CreditCard, Scale, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: Shield,
    title: "Protection acheteur",
    description: "Vos fonds sont sécurisés en séquestre jusqu'à réception",
  },
  {
    icon: Scale,
    title: "Résolution de litiges",
    description: "Un médiateur intervient en cas de problème",
  },
  {
    icon: CreditCard,
    title: "Paiement sécurisé",
    description: "Transactions chiffrées via Mobile Money et carte",
  },
  {
    icon: Gift,
    title: "Points fidélité",
    description: "Gagnez des points et cashback à chaque achat",
  },
];

const PlatformProtectionBanner = () => {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5 shadow-none">
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Pourquoi acheter via MIYASHI ?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {benefits.map((b) => (
            <div key={b.title} className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <b.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{b.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformProtectionBanner;
