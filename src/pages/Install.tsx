import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle, Share, Plus, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: "⚡", title: "Rapide", desc: "Chargement instantané, même hors ligne" },
    { icon: "🔔", title: "Notifications", desc: "Restez informé de vos commandes" },
    { icon: "📱", title: "Comme une app native", desc: "Expérience plein écran sur mobile" },
    { icon: "🔒", title: "Sécurisé", desc: "Paiements et données protégés" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Installer l'application" description="Installez MIYASHI sur votre téléphone pour un accès rapide, des notifications et une expérience native." canonical="/install" />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl shadow-elevated overflow-hidden">
              <img src="/pwa-icon-512.png" alt="MIYASHI" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-3">
              Installez <span className="text-gradient-hero">MIYASHI</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Accédez à MIYASHI directement depuis votre écran d'accueil
            </p>
          </motion.div>

          {isInstalled ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-0 shadow-elevated text-center">
                <CardContent className="p-8">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-accent" />
                  <h2 className="text-2xl font-display font-bold mb-2">MIYASHI est installé ! 🎉</h2>
                  <p className="text-muted-foreground">L'application est disponible sur votre écran d'accueil.</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Features */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4 mb-8">
                {features.map((f, i) => (
                  <Card key={i} className="border-0 shadow-card">
                    <CardContent className="p-5 text-center">
                      <span className="text-3xl mb-2 block">{f.icon}</span>
                      <h3 className="font-display font-bold">{f.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              {/* Install button or iOS instructions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="w-full h-14 text-lg bg-gradient-hero shadow-elevated">
                    <Download className="w-5 h-5 mr-2" />
                    Installer MIYASHI
                  </Button>
                ) : (
                  <Card className="border-0 shadow-elevated">
                    <CardContent className="p-6">
                      {isIOS ? (
                        <div className="space-y-4">
                          <h3 className="text-lg font-display font-bold text-center">Comment installer sur iPhone</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
                              <div className="flex items-center gap-2">
                                <span>Appuyez sur</span>
                                <Share className="w-5 h-5 text-primary" />
                                <span className="font-medium">Partager</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
                              <div className="flex items-center gap-2">
                                <span>Choisissez</span>
                                <Plus className="w-5 h-5 text-primary" />
                                <span className="font-medium">Sur l'écran d'accueil</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</span>
                              <span className="font-medium">Appuyez sur « Ajouter »</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="text-lg font-display font-bold text-center">Comment installer sur Android</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</span>
                              <div className="flex items-center gap-2">
                                <span>Appuyez sur</span>
                                <MoreVertical className="w-5 h-5 text-primary" />
                                <span className="font-medium">le menu du navigateur</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</span>
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-primary" />
                                <span className="font-medium">« Installer l'application »</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Install;
