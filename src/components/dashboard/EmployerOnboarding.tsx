import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Users, MessageSquare, CheckCircle2, ChevronRight, ChevronLeft, X } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Publiez votre première offre",
    description: "Décrivez le poste, les compétences requises, le budget et la deadline. Plus l'offre est détaillée, plus les candidatures seront qualifiées.",
    tip: "💡 Précisez si le travail est à distance, en présentiel ou hybride.",
  },
  {
    icon: Users,
    title: "Examinez les candidatures",
    description: "Consultez les profils, portfolios et avis des freelancers qui postulent. Comparez les tarifs et les compétences.",
    tip: "👀 Regardez les réalisations passées pour évaluer la qualité du travail.",
  },
  {
    icon: MessageSquare,
    title: "Communiquez et collaborez",
    description: "Utilisez la messagerie interne pour discuter des détails du projet. Définissez des étapes claires et un calendrier.",
    tip: "📅 Un brief clair réduit les allers-retours et accélère la livraison.",
  },
];

interface EmployerOnboardingProps {
  onDismiss: () => void;
}

const EmployerOnboarding = ({ onDismiss }: EmployerOnboardingProps) => {
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
            <span className="text-lg">🏢</span>
            <h3 className="font-display font-bold text-foreground">Guide recruteur</h3>
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
            <Button size="sm" onClick={() => navigate("/create?type=job")} className="bg-primary"><CheckCircle2 className="h-4 w-4 mr-1" /> Publier une offre</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployerOnboarding;
