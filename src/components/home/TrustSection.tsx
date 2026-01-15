import { Shield, Lock, CreditCard, Headphones } from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Transactions sécurisées",
    description: "Paiement sous séquestre jusqu'à validation de la commande",
  },
  {
    icon: Lock,
    title: "Données protégées",
    description: "Chiffrement SSL et conformité aux normes de sécurité",
  },
  {
    icon: CreditCard,
    title: "Paiement flexible",
    description: "Mobile Money, cartes bancaires, wallet intégré",
  },
  {
    icon: Headphones,
    title: "Support 24/7",
    description: "Équipe dédiée pour résoudre vos problèmes rapidement",
  },
];

const TrustSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card border-y border-border">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
