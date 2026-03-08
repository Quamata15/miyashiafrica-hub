import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, FileText, Briefcase, Rocket, ChevronRight, ChevronLeft, X, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: User,
    title: "Complétez votre profil freelance",
    description: "Ajoutez votre titre professionnel, vos compétences, votre taux horaire et vos années d'expérience. Un profil complet attire plus de clients.",
    tip: "💡 Les freelancers avec une photo et une bio complète reçoivent 3x plus de propositions.",
  },
  {
    icon: FileText,
    title: "Parcourez les offres d'emploi",
    description: "Explorez les missions disponibles dans votre domaine. Filtrez par compétences, budget et type de contrat.",
    tip: "📋 Activez les alertes pour être notifié dès qu'une offre correspond à vos compétences.",
  },
  {
    icon: Briefcase,
    title: "Postulez avec impact",
    description: "Rédigez une lettre de motivation personnalisée et proposez un tarif compétitif. Montrez votre valeur ajoutée.",
    tip: "✍️ Les candidatures personnalisées ont 5x plus de chances d'être retenues.",
  },
  {
    icon: Rocket,
    title: "Livrez un travail de qualité",
    description: "Respectez les délais et communiquez régulièrement avec votre client. Un bon avis ouvre la porte à plus de missions.",
    tip: "⭐ Chaque avis positif augmente votre visibilité dans les résultats de recherche.",
  },
];

interface FreelanceOnboardingProps {
  onDismiss: () => void;
}

const FreelanceOnboarding = ({ onDismiss }: FreelanceOnboardingProps) => {
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
            <span className="text-lg">💼</span>
            <h3 className="font-display font-bold text-foreground">Guide freelance</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>
        <div className="px-4 pb-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">Étape {currentStep + 1} sur {steps.length}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="px-4 pb-4">
            <div className="flex items-start gap-4 mt-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><StepIcon className="w-6 h-6 text-primary" /></div>
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
            <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} className="bg-primary">Suivant <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/profile?tab=freelance")} className="bg-primary"><CheckCircle2 className="h-4 w-4 mr-1" /> Compléter mon profil</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FreelanceOnboarding;
