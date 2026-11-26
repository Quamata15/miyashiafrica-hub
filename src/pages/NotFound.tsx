import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/components/brand/BrandMark";
import SEOHead from "@/components/SEOHead";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-warm px-4">
      <SEOHead title="Page introuvable" noindex />
      <div className="text-center max-w-md">
        <BrandMark className="w-24 h-24 mx-auto mb-6" />
        <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Page introuvable</h2>
        <p className="text-muted-foreground mb-8">
          Désolé, la page <code className="text-sm bg-muted px-2 py-1 rounded">{location.pathname}</code> n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-gradient-to-r from-primary to-secondary">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/marketplace">
              <Search className="h-4 w-4 mr-2" />
              Voir les produits
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Page précédente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
