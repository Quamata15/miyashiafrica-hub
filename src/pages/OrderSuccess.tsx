import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Truck, MessageSquare, Home } from "lucide-react";
import { motion } from "framer-motion";

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const total = searchParams.get("total");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-header pb-10 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
          >
            <Card className="border-0 shadow-elevated text-center overflow-hidden">
              <div className="bg-gradient-hero p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-20 h-20 mx-auto text-primary-foreground" />
                </motion.div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h1 className="text-2xl font-display font-bold mb-2">Commande confirmée ! 🎉</h1>
                  <p className="text-muted-foreground">
                    Vos fonds sont sécurisés en escrow jusqu'à la réception de votre commande.
                  </p>
                </div>

                {orderId && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">N° de commande</p>
                    <p className="font-mono font-bold text-lg">#{orderId.slice(0, 8)}</p>
                    {total && (
                      <p className="text-primary font-semibold mt-1">
                        {Number(total).toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 text-left">
                  {[
                    { icon: Package, text: "Le vendeur prépare votre commande" },
                    { icon: Truck, text: "Sélectionnez un livreur pour l'expédition" },
                    { icon: MessageSquare, text: "Contactez le vendeur via la messagerie" },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{step.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => navigate("/select-driver?order=" + (orderId || "latest"))}
                    className="h-11 bg-gradient-hero text-base"
                  >
                    <Truck className="w-5 h-5 mr-2" />
                    Choisir un livreur
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="h-11"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Voir mes commandes
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

export default OrderSuccess;
