import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Package, Camera, DollarSign, Rocket, ChevronRight, ChevronLeft, X, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "Créez votre premier produit",
    description: "Ajoutez un titre, une description et un prix pour votre produit. Soyez clair et précis pour attirer les acheteurs.",
    tip: "💡 Un bon titre contient le nom du produit, sa marque et sa taille/couleur.",
  },
  {
    icon: Camera,
    title: "Ajoutez de belles photos",
    description: "Les produits avec des photos de qualité se vendent 3x plus vite. Prenez vos photos en lumière naturelle.",
    tip: "📸 Ajoutez au moins 3 photos sous différents angles.",
  },
  {
    icon: DollarSign,
    title: "Fixez un prix compétitif",
    description: "Regardez les prix de produits similaires sur la marketplace. Un bon prix attire les premiers acheteurs rapidement.",
    tip: "💰 Vous pouvez ajuster vos prix à tout moment depuis votre tableau de bord.",
  },
  {
    icon: Rocket,
    title: "Publiez et boostez",
    description: "Une fois publié, vous pouvez booster votre produit pour qu'il apparaisse en tête des résultats de recherche.",
    tip: "🚀 Les vendeurs qui boostent leurs produits vendent 5x plus vite !",
  },
];

interface SellerOnboardingProps {
  onDismiss: () => void;
}

const SellerOnboarding = ({ onDismiss }: SellerOnboardingProps) => {
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
            <span className="text-lg">🎓</span>
            <h3 className="font-display font-bold text-foreground">Guide vendeur</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pb-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            Étape {currentStep + 1} sur {steps.length}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4"
          >
            <div className="flex items-start gap-4 mt-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <StepIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                <div className="bg-accent/30 rounded-lg p-2.5 text-xs text-foreground/80">
                  {step.tip}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 pb-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} className="bg-primary">
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/create")} className="bg-primary">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Créer mon produit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerOnboarding;
