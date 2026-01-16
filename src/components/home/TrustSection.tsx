import { Shield, Lock, CreditCard, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const trustFeatures = [
  {
    icon: Shield,
    title: "Transactions sécurisées",
    description: "Paiement sous séquestre jusqu'à validation de la commande",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Lock,
    title: "Données protégées",
    description: "Chiffrement SSL et conformité aux normes de sécurité",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: CreditCard,
    title: "Paiement flexible",
    description: "Mobile Money, cartes bancaires, wallet intégré",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Headphones,
    title: "Support 24/7",
    description: "Équipe dédiée pour résoudre vos problèmes rapidement",
    gradient: "from-primary/20 to-primary/5",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const TrustSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card border-y border-border relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1)_0%,transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,hsl(var(--secondary)/0.1)_0%,transparent_50%)]" />
      </div>
      
      <div className="container relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="flex flex-col items-center text-center group"
            >
              <motion.div 
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-soft`}
                whileHover={{ scale: 1.1, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <feature.icon className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="font-display font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
