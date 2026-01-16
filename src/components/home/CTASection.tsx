import { Button } from "@/components/ui/button";
import { Store, Briefcase, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Become a Seller */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-hero rounded-3xl p-8 md:p-12 overflow-hidden group"
          >
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <motion.div 
                className="absolute top-0 right-0 w-64 h-64 border-[40px] border-primary-foreground rounded-full -translate-y-1/2 translate-x-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-48 h-48 border-[30px] border-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />
            </div>
            
            <div className="relative">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Store className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              
              <h3 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                Devenez vendeur
              </h3>
              
              <p className="text-primary-foreground/80 mb-8 max-w-sm">
                Créez votre boutique en ligne et touchez des milliers de clients à travers l'Afrique de l'Ouest.
              </p>
              
              <ul className="space-y-2 mb-8">
                {["Inscription gratuite", "Commission réduite", "Paiements sécurisés", "Support dédié"].map((item, index) => (
                  <motion.li 
                    key={item} 
                    className="flex items-center gap-2 text-sm text-primary-foreground/90"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    {item}
                  </motion.li>
                ))}
              </ul>
              
              <Link to="/create?type=product">
                <Button 
                  variant="glass" 
                  size="lg" 
                  className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30 group-hover:scale-105 transition-transform"
                >
                  Commencer à vendre
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Become a Provider */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-accent rounded-3xl p-8 md:p-12 overflow-hidden group"
          >
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <motion.div 
                className="absolute top-0 right-0 w-64 h-64 border-[40px] border-accent-foreground rounded-full -translate-y-1/2 translate-x-1/2"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-48 h-48 border-[30px] border-accent-foreground rounded-full translate-y-1/2 -translate-x-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />
            </div>
            
            <div className="relative">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-accent-foreground/20 backdrop-blur flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: -10 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Briefcase className="w-8 h-8 text-accent-foreground" />
              </motion.div>
              
              <h3 className="font-display text-2xl md:text-3xl font-bold text-accent-foreground mb-4">
                Devenez prestataire
              </h3>
              
              <p className="text-accent-foreground/80 mb-8 max-w-sm">
                Proposez vos services ou travaillez en freelance sur des projets passionnants.
              </p>
              
              <ul className="space-y-2 mb-8">
                {["Profil vérifié", "Missions qualifiées", "Paiement garanti", "Communauté active"].map((item, index) => (
                  <motion.li 
                    key={item} 
                    className="flex items-center gap-2 text-sm text-accent-foreground/90"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                    {item}
                  </motion.li>
                ))}
              </ul>
              
              <Link to="/create?type=service">
                <Button 
                  variant="glass" 
                  size="lg" 
                  className="bg-accent-foreground/20 text-accent-foreground border-accent-foreground/30 hover:bg-accent-foreground/30 group-hover:scale-105 transition-transform"
                >
                  Proposer mes services
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
