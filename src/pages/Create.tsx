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

type Category = Tables<"categories">;

const Create = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("type") || "product";
  
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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Créer une publication
          </h1>
          <p className="text-muted-foreground mt-2">
            Choisissez le type de publication que vous souhaitez créer
          </p>
        </motion.div>

        <Tabs defaultValue={initialTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-card shadow-card rounded-xl">
            <TabsTrigger
              value="product"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produit</span>
            </TabsTrigger>
            <TabsTrigger
              value="service"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground rounded-lg"
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Service</span>
            </TabsTrigger>
            <TabsTrigger
              value="job"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Offre d'emploi</span>
            </TabsTrigger>
            <TabsTrigger
              value="freelance"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil Freelance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product">
            <VerificationGate requiredFor="sell">
              <ProductForm categories={productCategories} />
            </VerificationGate>
          </TabsContent>

          <TabsContent value="service">
            <VerificationGate requiredFor="provide">
              <ServiceForm categories={serviceCategories} />
            </VerificationGate>
          </TabsContent>

          <TabsContent value="job">
            <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-sm">Pour trier automatiquement les candidatures (compétences pondérées, questions éliminatoires) et faire passer des entretiens vidéo ou enregistrés, utilisez l'éditeur complet de l'espace Recruteur.</p>
              <Button size="sm" onClick={async () => { await supabase.rpc("assign_own_role", { p_role: "employer" }); navigate("/dashboard?espace=recruteur&onglet=offres&nouvelle=1"); }}>Éditeur complet</Button>
            </div>
            <JobForm categories={jobCategories} />
          </TabsContent>

          <TabsContent value="freelance">
            <FreelanceProfileForm />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Create;
