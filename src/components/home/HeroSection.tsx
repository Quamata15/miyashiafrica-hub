import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Briefcase, Users, Sparkles, Truck, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-warm pattern-african" />
      <motion.div 
        className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      
      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 text-accent mb-6 border border-accent/20"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Un marché de tous les jours • MIYASHI by ASHIZAN</span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-7xl font-extrabold text-foreground leading-tight mb-6"
          >
            Achetez, Vendez, <br className="hidden sm:block" />
            <span className="text-gradient-hero">Faites-vous livrer</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            MIYASHI connecte acheteurs, vendeurs, prestataires de services et livreurs dans un écosystème sécurisé, pensé pour l'Afrique.
          </motion.p>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/marketplace">
              <Button size="lg" className="bg-gradient-hero text-primary-foreground h-14 px-8 text-lg rounded-2xl shadow-elevated hover:shadow-soft transition-all">
                Explorer le marché
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl">
                Créer un compte
              </Button>
            </Link>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto"
          >
            {[
              { value: "10K+", label: "Vendeurs actifs" },
              { value: "50K+", label: "Produits & Services" },
              { value: "2K+", label: "Livreurs" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-4 gap-4 mt-20">
          {[
            {
              href: "/marketplace",
              icon: ShoppingBag,
              color: "text-primary",
              bg: "bg-primary/10",
              title: "Marketplace",
              desc: "Produits locaux, mode, électronique, alimentation",
            },
            {
              href: "/services",
              icon: Wrench,
              color: "text-secondary",
              bg: "bg-secondary/10",
              title: "Services & Métiers",
              desc: "Plombier, coiffeur, mécanicien, restaurant...",
            },
            {
              href: "/freelance",
              icon: Users,
              color: "text-accent",
              bg: "bg-accent/10",
              title: "Freelance & Emploi",
              desc: "Trouvez des talents ou des missions",
            },
            {
              href: "/driver-registration",
              icon: Truck,
              color: "text-secondary",
              bg: "bg-secondary/10",
              title: "Livraison",
              desc: "Devenez livreur et gagnez 550F/km",
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <Link
                to={card.href}
                className="group relative bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-2 border border-border block h-full"
              >
                <motion.div 
                  className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </motion.div>
                <h2 className="font-display text-lg font-bold text-foreground mb-1">{card.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">{card.desc}</p>
                <span className={`inline-flex items-center gap-1 ${card.color} font-semibold text-sm group-hover:gap-2 transition-all`}>
                  Découvrir <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
