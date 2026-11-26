import { motion } from "framer-motion";
import { ShieldCheck, Lock, BadgeCheck, Headphones } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Séquestre", description: "Paiement bloqué jusqu'à la réception de la commande" },
  { icon: BadgeCheck, title: "Vendeurs vérifiés", description: "Identité contrôlée (KYC) avant tout encaissement" },
  { icon: Lock, title: "Données protégées", description: "Chiffrement et accès strictement limités" },
  { icon: Headphones, title: "Litiges arbitrés", description: "Une équipe tranche en cas de désaccord" },
];

const TrustSection = () => {
  return (
    <section className="py-16 border-t border-border/60">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col md:flex-row items-start gap-3"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl glass flex items-center justify-center">
                <f.icon className="w-5 h-5 text-accent" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold mb-1">{f.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
