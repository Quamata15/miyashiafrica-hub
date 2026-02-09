import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  HelpCircle, MessageCircle, FileText, Shield, Phone, Mail,
  ChevronRight, BookOpen, Truck, CreditCard, Users, Package
} from "lucide-react";

const Support = () => {
  const navigate = useNavigate();

  const categories = [
    { icon: BookOpen, title: "Centre d'aide", desc: "Guides et tutoriels", href: "/help", color: "bg-primary/10 text-primary" },
    { icon: MessageCircle, title: "Nous contacter", desc: "Support par message", href: "/contact", color: "bg-secondary/10 text-secondary" },
    { icon: HelpCircle, title: "FAQ", desc: "Questions fréquentes", href: "/faq", color: "bg-accent/10 text-accent-foreground" },
    { icon: FileText, title: "Conditions d'utilisation", desc: "Règles de la plateforme", href: "/terms", color: "bg-muted text-muted-foreground" },
  ];

  const quickHelp = [
    { icon: Package, title: "Vendre un produit", desc: "Comment publier et gérer vos articles" },
    { icon: Truck, title: "Suivi de livraison", desc: "Suivre vos commandes en temps réel" },
    { icon: CreditCard, title: "Paiements", desc: "Moyens de paiement et escrow" },
    { icon: Users, title: "Devenir livreur", desc: "Rejoindre le réseau de livraison" },
    { icon: Shield, title: "Sécurité & KYC", desc: "Vérification et protection du compte" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-hero flex items-center justify-center">
              <HelpCircle className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">Comment pouvons-nous vous aider ?</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Trouvez des réponses à vos questions ou contactez notre équipe de support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {categories.map((cat, i) => (
              <motion.div key={cat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="border-0 shadow-card cursor-pointer hover:shadow-elevated transition-all group" onClick={() => navigate(cat.href)}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${cat.color} flex items-center justify-center`}>
                      <cat.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg">{cat.title}</h3>
                      <p className="text-sm text-muted-foreground">{cat.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-2xl font-display font-bold mb-6">Aide rapide</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickHelp.map((item, i) => (
                <Card key={item.title} className="border-0 shadow-card hover:shadow-elevated transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <item.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
            <Card className="border-0 shadow-elevated bg-gradient-hero text-primary-foreground">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-display font-bold mb-3">Besoin d'aide urgente ?</h3>
                <p className="opacity-90 mb-6">Notre équipe est disponible 7j/7 pour vous assister</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="secondary" onClick={() => navigate("/contact")}>
                    <Mail className="w-4 h-4 mr-2" /> Envoyer un message
                  </Button>
                  <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    <Phone className="w-4 h-4 mr-2" /> +228 97 09 56 85
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
