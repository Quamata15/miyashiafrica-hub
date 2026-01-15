import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Briefcase, Users } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-warm" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium">La marketplace africaine de confiance</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Achetez, Vendez, <br className="hidden sm:block" />
            <span className="text-gradient-hero">Travaillez</span> sans frontières
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            MIYASHI connecte acheteurs, vendeurs, prestataires et freelances dans un écosystème sécurisé, pensé pour l'Afrique.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl">
              Explorer le marché
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="xl">
              Devenir vendeur
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">10K+</div>
              <div className="text-sm text-muted-foreground">Vendeurs actifs</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">50K+</div>
              <div className="text-sm text-muted-foreground">Produits</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">5K+</div>
              <div className="text-sm text-muted-foreground">Freelances</div>
            </div>
          </div>
        </div>

        {/* Three Main Blocks */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <a
            href="#produits"
            className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border border-border overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Acheter des produits
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Des milliers de produits locaux livrés chez vous. Mode, électronique, alimentation et plus.
              </p>
              <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                Explorer
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>

          <a
            href="#services"
            className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border border-border overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Trouver un service
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Coiffure, plomberie, développement web... Trouvez le prestataire qu'il vous faut.
              </p>
              <span className="inline-flex items-center gap-2 text-secondary font-semibold text-sm group-hover:gap-3 transition-all">
                Découvrir
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>

          <a
            href="#freelance"
            className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border border-border overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Travailler / Recruter
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Freelances talentueux ou missions à distance. Trouvez votre prochaine opportunité.
              </p>
              <span className="inline-flex items-center gap-2 text-accent font-semibold text-sm group-hover:gap-3 transition-all">
                Commencer
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
