import { UserPlus, Search, CreditCard, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Inscription gratuite en moins de 2 minutes avec vérification sécurisée",
  },
  {
    icon: Search,
    title: "Explorez & Choisissez",
    description: "Parcourez produits, services ou talents selon vos besoins",
  },
  {
    icon: CreditCard,
    title: "Payez en sécurité",
    description: "Paiement sécurisé via Mobile Money, carte bancaire ou wallet MIYASHI",
  },
  {
    icon: CheckCircle,
    title: "Recevez & Validez",
    description: "Votre commande livrée, votre satisfaction garantie",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-warm relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="container relative">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Simple & Sécurisé
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Un processus simple et transparent pour tous vos achats et services
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-20" />
          
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-hero text-primary-foreground text-xs font-bold flex items-center justify-center z-10">
                {index + 1}
              </div>
              
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-card shadow-card flex items-center justify-center mb-6 relative">
                <step.icon className="w-8 h-8 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
