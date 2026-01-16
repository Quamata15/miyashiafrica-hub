import { UserPlus, Search, CreditCard, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Inscription gratuite en moins de 2 minutes avec vérification sécurisée",
    color: "from-primary to-primary/70",
  },
  {
    icon: Search,
    title: "Explorez & Choisissez",
    description: "Parcourez produits, services ou talents selon vos besoins",
    color: "from-secondary to-secondary/70",
  },
  {
    icon: CreditCard,
    title: "Payez en sécurité",
    description: "Paiement sécurisé via Mobile Money, carte bancaire ou wallet MIYASHI",
    color: "from-accent to-accent/70",
  },
  {
    icon: CheckCircle,
    title: "Recevez & Validez",
    description: "Votre commande livrée, votre satisfaction garantie",
    color: "from-primary to-secondary",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-warm relative overflow-hidden">
      {/* Decorative elements */}
      <motion.div 
        className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="container relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Simple & Sécurisé
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Un processus simple et transparent pour tous vos achats et services
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-20" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <motion.div 
                className={`absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-r ${step.color} text-primary-foreground text-xs font-bold flex items-center justify-center z-10`}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 + 0.3, type: "spring" }}
              >
                {index + 1}
              </motion.div>
              
              {/* Icon */}
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-card shadow-card flex items-center justify-center mb-6 relative"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <step.icon className="w-8 h-8 text-primary" />
              </motion.div>
              
              {/* Content */}
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
