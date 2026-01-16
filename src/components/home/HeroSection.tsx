import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Briefcase, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-warm" />
      <motion.div 
        className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl"
        animate={{ 
          rotate: [0, 360],
        }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">La marketplace africaine de confiance</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
          >
            Achetez, Vendez, <br className="hidden sm:block" />
            <span className="text-gradient-hero">Travaillez</span> sans frontières
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            MIYASHI connecte acheteurs, vendeurs, prestataires et freelances dans un écosystème sécurisé, pensé pour l'Afrique.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/marketplace">
              <Button variant="hero" size="xl">
                Explorer le marché
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/create?type=product">
              <Button variant="outline" size="xl">
                Devenir vendeur
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto"
          >
            {[
              { value: "10K+", label: "Vendeurs actifs" },
              { value: "50K+", label: "Produits" },
              { value: "5K+", label: "Freelances" },
            ].map((stat, index) => (
              <motion.div 
                key={stat.label}
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              >
                <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Three Main Blocks */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            {
              href: "/marketplace",
              icon: ShoppingBag,
              iconColor: "text-primary",
              bgColor: "bg-primary/10",
              decorColor: "bg-primary/5",
              title: "Acheter des produits",
              description: "Des milliers de produits locaux livrés chez vous. Mode, électronique, alimentation et plus.",
              linkText: "Explorer",
              linkColor: "text-primary",
            },
            {
              href: "/services",
              icon: Briefcase,
              iconColor: "text-secondary",
              bgColor: "bg-secondary/10",
              decorColor: "bg-secondary/5",
              title: "Trouver un service",
              description: "Coiffure, plomberie, développement web... Trouvez le prestataire qu'il vous faut.",
              linkText: "Découvrir",
              linkColor: "text-secondary",
            },
            {
              href: "/freelance",
              icon: Users,
              iconColor: "text-accent",
              bgColor: "bg-accent/10",
              decorColor: "bg-accent/5",
              title: "Travailler / Recruter",
              description: "Freelances talentueux ou missions à distance. Trouvez votre prochaine opportunité.",
              linkText: "Commencer",
              linkColor: "text-accent",
            },
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            >
              <Link
                to={card.href}
                className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-2 border border-border overflow-hidden block"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${card.decorColor} rounded-full -translate-y-1/2 translate-x-1/2`} />
                <div className="relative">
                  <motion.div 
                    className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-5`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                  </motion.div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {card.description}
                  </p>
                  <span className={`inline-flex items-center gap-2 ${card.linkColor} font-semibold text-sm group-hover:gap-3 transition-all`}>
                    {card.linkText}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
