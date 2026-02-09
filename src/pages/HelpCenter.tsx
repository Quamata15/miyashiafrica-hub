import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ShoppingBag, Truck, CreditCard, UserCheck, Shield, Briefcase, 
  Users, Star, BookOpen, ChevronRight
} from "lucide-react";

const HelpCenter = () => {
  const navigate = useNavigate();

  const guides = [
    { icon: ShoppingBag, title: "Acheter sur MIYASHI", desc: "Parcourir, commander et payer en toute sécurité", articles: 8 },
    { icon: Truck, title: "Livraisons", desc: "Suivi, tarifs et choix du livreur", articles: 6 },
    { icon: CreditCard, title: "Paiements", desc: "Mobile Money, cartes, escrow et remboursements", articles: 5 },
    { icon: UserCheck, title: "Vendre des produits", desc: "Publier, gérer et promouvoir vos articles", articles: 7 },
    { icon: Briefcase, title: "Services & Prestataires", desc: "Offrir vos services et gérer les abonnements", articles: 5 },
    { icon: Users, title: "Freelance & Emplois", desc: "Postuler, recruter et gérer les missions", articles: 4 },
    { icon: Shield, title: "Sécurité & Vérification", desc: "KYC, protection du compte et confidentialité", articles: 6 },
    { icon: Star, title: "Boostage & Promotions", desc: "Mettre en avant vos produits et services", articles: 3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-display font-bold mb-3">Centre d'Aide</h1>
            <p className="text-muted-foreground">Guides et tutoriels pour utiliser MIYASHI</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guides.map((g, i) => (
              <motion.div key={g.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-card hover:shadow-elevated transition-all cursor-pointer group">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <g.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{g.title}</h3>
                      <p className="text-sm text-muted-foreground">{g.desc}</p>
                      <p className="text-xs text-primary mt-1">{g.articles} articles</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
