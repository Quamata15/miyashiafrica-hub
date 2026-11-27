import AiAssistant from "@/components/support/AiAssistant";
import { usePrefs } from "@/lib/prefs";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  HelpCircle, MessageCircle, FileText, Shield, Phone, Mail,
  ChevronRight, BookOpen, Truck, CreditCard, Users, Package
} from "lucide-react";

const Support = () => {
  const { flag } = usePrefs();
  const navigate = useNavigate();

  const categories = [
    { icon: BookOpen, title: "Centre d'aide", desc: "Guides et tutoriels", href: "/help", color: "bg-primary/10 text-primary" },
    { icon: MessageCircle, title: "Nous contacter", desc: "Support par message", href: "/contact", color: "bg-secondary/10 text-secondary" },
    { icon: HelpCircle, title: "FAQ", desc: "Questions fréquentes", href: "/faq", color: "bg-accent/10 text-accent-foreground" },
    { icon: FileText, title: "Conditions d'utilisation", desc: "Règles de la plateforme", href: "/terms", color: "bg-muted text-muted-foreground" },
  ];

  const quickHelp = [
    { icon: Package, title: "Vendre un produit", desc: "Publier et gérer vos articles", href: "/help/vendre-des-produits" },
    { icon: Truck, title: "Suivi de livraison", desc: "Suivre vos commandes", href: "/help/livraisons" },
    { icon: CreditCard, title: "Paiements", desc: "Moyens de paiement et séquestre", href: "/help/paiements" },
    { icon: Users, title: "Devenir livreur", desc: "Rejoindre le réseau", href: "/driver-registration" },
    { icon: Shield, title: "Sécurité & KYC", desc: "Vérification du compte", href: "/help/securite-verification" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-hero flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">Comment pouvons-nous vous aider ?</h1>
              <p className="text-sm text-muted-foreground">Trouvez une réponse ou écrivez à notre équipe.</p>
            </div>
          </motion.div>

          <div className={`grid gap-4 ${flag("ai_assistant") ? "lg:grid-cols-2 lg:items-start" : ""}`}>
            {flag("ai_assistant") && <div className="min-w-0"><AiAssistant /></div>}

            <div className="space-y-4 min-w-0">
              <div className={`grid gap-2 ${flag("ai_assistant") ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
                {categories.map((cat) => (
                  <button key={cat.title} type="button" onClick={() => navigate(cat.href)}
                    className="group flex items-center gap-3 rounded-xl border border-foreground/10 bg-card/80 p-3 text-left shadow-card hover:border-primary/40 transition-colors min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-lg ${cat.color} flex items-center justify-center`}>
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sm leading-tight">{cat.title}</h3>
                      <p className="text-xs text-muted-foreground">{cat.desc}</p>
                    </div>
                    <ChevronRight className="hidden sm:block lg:hidden xl:block w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>

              <Card className="border-0 shadow-elevated bg-gradient-hero text-primary-foreground">
                <CardContent className="p-4 sm:p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[12rem]">
                    <h2 className="text-lg font-display font-bold leading-tight">Besoin d'aide urgente ?</h2>
                    <p className="text-sm opacity-90">Notre équipe répond 7j/7.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => navigate("/contact")}>
                      <Mail className="w-4 h-4 mr-1.5" /> Écrire
                    </Button>
                    <Button size="sm" variant="outline" asChild className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                      <a href="tel:+22897095685"><Phone className="w-4 h-4 mr-1.5" /> +228 97 09 56 85</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <section className="mt-5" aria-labelledby="quick-help">
            <h2 id="quick-help" className="text-lg font-display font-bold mb-2">Aide rapide</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {quickHelp.map((item, i) => (
                <button key={item.title} type="button" onClick={() => navigate(item.href)}
                  className={`flex items-start gap-2.5 rounded-xl border border-foreground/10 bg-card/80 p-3 text-left hover:border-primary/40 transition-colors min-w-0 ${i === quickHelp.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
                  <item.icon className="w-5 h-5 shrink-0 text-primary mt-0.5" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm leading-tight">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
