import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Heart, ShoppingCart, Star, ChevronRight, ChevronLeft, X, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Explorez le marketplace",
    description: "Parcourez les catégories ou utilisez la recherche pour trouver des produits et services. Filtrez par prix, localisation et avis.",
    tip: "💡 Utilisez les filtres avancés pour affiner vos résultats rapidement.",
  },
  {
    icon: Heart,
    title: "Sauvegardez vos favoris",
    description: "Cliquez sur le cœur pour ajouter un article à vos favoris. Vous serez notifié en cas de baisse de prix.",
    tip: "❤️ Retrouvez tous vos favoris depuis le menu principal.",
  },
  {
    icon: ShoppingCart,
    title: "Commandez en toute sécurité",
    description: "Ajoutez au panier, choisissez votre mode de paiement et votre adresse. Votre argent est protégé par le système d'escrow jusqu'à réception.",
    tip: "🔒 Ne confirmez la réception qu'après avoir vérifié votre commande.",
  },
  {
    icon: Star,
    title: "Partagez votre expérience",
    description: "Après réception, laissez un avis pour aider la communauté et encourager les bons vendeurs.",
    tip: "⭐ Les acheteurs qui laissent des avis bénéficient de recommandations personnalisées.",
  },
];

interface BuyerOnboardingProps {
  onDismiss: () => void;
}

const BuyerOnboarding = ({ onDismiss }: BuyerOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <Card className="border-0 shadow-elevated overflow-hidden mb-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h3 className="font-display font-bold text-foreground">Guide acheteur</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pb-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">Étape {currentStep + 1} sur {steps.length}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="px-4 pb-4">
            <div className="flex items-start gap-4 mt-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <StepIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                <div className="bg-accent/30 rounded-lg p-2.5 text-xs text-foreground/80">{step.tip}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 pb-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} className="bg-primary">
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/marketplace")} className="bg-primary">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Explorer le marketplace
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BuyerOnboarding;
