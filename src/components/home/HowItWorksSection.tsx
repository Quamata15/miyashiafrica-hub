import { motion } from "framer-motion";
import { Search, Smartphone, Lock, PackageCheck } from "lucide-react";

const steps = [
  { icon: Search, title: "Trouvez", description: "Cherchez un produit, un service ou un talent près de chez vous." },
  { icon: Smartphone, title: "Payez", description: "Mobile money ou carte via FedaPay, en quelques secondes." },
  { icon: Lock, title: "Séquestre", description: "Votre argent est bloqué chez MIYASHI, pas chez le vendeur." },
  { icon: PackageCheck, title: "Recevez", description: "Vous confirmez la réception : le vendeur est payé." },
];

const HowItWorksSection = () => {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-grid mask-radial opacity-70" aria-hidden />
      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-accent mb-3">Zéro arnaque</p>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight mb-4">
            Acheter devient <span className="text-accent whitespace-nowrap">sans risque</span>
          </h2>
          <p className="text-muted-foreground">
            Chaque paiement transite par le séquestre MIYASHI. L'argent ne bouge qu'une fois la commande reçue.
          </p>
        </div>

        <div className="relative grid md:grid-cols-4 gap-4">
          <div
            className="hidden md:block absolute top-[52px] left-[12%] right-[12%] h-px bg-gradient-to-r from-primary/60 to-accent/60"
            aria-hidden
          />
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative glass rounded-2xl p-6 text-center"
            >
              <div className="relative mx-auto mb-5 w-[72px] h-[72px]">
                <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl opacity-30" aria-hidden />
                <div className="relative w-full h-full rounded-2xl neon-border bg-background flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground font-display text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
