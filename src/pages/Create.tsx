import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductForm from "@/components/forms/ProductForm";
import ServiceForm from "@/components/forms/ServiceForm";
import JobForm from "@/components/forms/JobForm";
import FreelanceProfileForm from "@/components/forms/FreelanceProfileForm";
import VerificationGate from "@/components/kyc/VerificationGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Briefcase, Users, User, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import { useSpaces, type Feature } from "@/hooks/useSpaces";
import { SpaceLocked } from "@/components/spaces/SpaceAccess";

type Category = Tables<"categories">;

const Create = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sp = useSpaces();
  // Only what the account's spaces publish.
  const TABS: { value: string; feature: Feature; label: string; short: string; icon: React.ElementType; tone: string }[] = [
    { value: "product", feature: "sell", label: "Produit", short: "Produit", icon: Package, tone: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" },
    { value: "service", feature: "provide", label: "Service", short: "Service", icon: Briefcase, tone: "data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground" },
    { value: "job", feature: "recruit", label: "Offre d'emploi ou mission", short: "Emploi / mission", icon: Users, tone: "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground" },
    { value: "freelance", feature: "apply", label: "Profil Freelance", short: "Profil freelance", icon: User, tone: "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground" },
  ];
  const tabs = TABS.filter((t) => sp.can(t.feature));
  const wantedTab = searchParams.get("type");
  const initialTab = tabs.find((t) => t.value === wantedTab)?.value ?? tabs[0]?.value ?? "product";
  
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [serviceCategories, setServiceCategories] = useState<Category[]>([]);
  const [jobCategories, setJobCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) {
      setProductCategories(data.filter((c) => c.type === "product"));
      setServiceCategories(data.filter((c) => c.type === "service"));
      setJobCategories(data.filter((c) => c.type === "job"));
    }
  };

  if (authLoading || sp.loading) {
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
        <main className="flex-1 flex items-center justify-center pt-header">
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
              Vous devez être connecté pour créer du contenu
            </p>
            <Button variant="hero" onClick={() => navigate("/auth")}>
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
      <main className="flex-1 container mx-auto max-w-5xl px-4 pb-8 pt-header">
        <Tabs defaultValue={initialTab} className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-2 min-w-0 mr-auto">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour" className="shrink-0 -ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight">Créer une publication</h1>
                {tabs.length <= 1 && (
                  <p className="text-sm text-muted-foreground">
                    {tabs.length === 1 ? `Nouvelle publication : ${tabs[0].label.toLowerCase()}` : "Ouvrez l'espace qui correspond à ce que vous voulez publier"}
                  </p>
                )}
              </div>
            </div>
            {tabs.length > 1 && (
              <TabsList className="grid w-full md:w-auto h-auto p-1 bg-card shadow-card rounded-xl" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${t.tone}`}>
                    <t.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-xs sm:text-sm">{t.short}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
          </div>

          {tabs.length === 0 && (
            <SpaceLocked feature={wantedTab === "service" ? "provide" : wantedTab === "job" ? "recruit" : wantedTab === "freelance" ? "apply" : "publish"}
              title="Aucun de vos espaces ne publie d'annonces" />
          )}

          {sp.can("sell") && (
            <TabsContent value="product">
              <VerificationGate requiredFor="sell">
                <ProductForm categories={productCategories} />
              </VerificationGate>
            </TabsContent>
          )}

          {sp.can("provide") && (
            <TabsContent value="service">
              <VerificationGate requiredFor="provide">
                <ServiceForm categories={serviceCategories} />
              </VerificationGate>
            </TabsContent>
          )}

          {sp.can("recruit") && (
            <TabsContent value="job">
              <JobForm categories={jobCategories} onFullEditor={() => navigate("/dashboard?espace=recruteur&onglet=offres&nouvelle=1")} />
            </TabsContent>
          )}

          {sp.can("apply") && (
            <TabsContent value="freelance">
              <FreelanceProfileForm />
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Create;
