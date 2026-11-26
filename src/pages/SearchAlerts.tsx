import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SearchAlertForm from "@/components/search/SearchAlertForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, BellRing } from "lucide-react";
import { motion } from "framer-motion";

const SearchAlerts = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-4">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour gérer vos alertes de recherche
            </p>
            <Button variant="default" onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-28">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <BellRing className="h-8 w-8 text-primary" />
            Alertes de Recherche
          </h1>
          <p className="text-muted-foreground mt-2">
            Soyez notifié dès qu'un produit, service ou offre correspond à vos critères
          </p>
        </motion.div>

        <SearchAlertForm />
      </main>
      <Footer />
    </div>
  );
};

export default SearchAlerts;
