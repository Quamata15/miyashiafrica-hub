import { useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { SiteBanners, SponsoredStrip } from "@/components/home/SiteBanners";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FreelanceProfiles from "@/components/freelance/FreelanceProfiles";
import JobOffers from "@/components/freelance/JobOffers";
import PageHero from "@/components/layout/PageHero";
import { PHOTOS } from "@/lib/photos";

const Freelance = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("onglet") === "offres" ? "jobs" : "freelancers";
  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Freelance & Emplois" description="Trouvez des freelances qualifiés ou des opportunités d'emploi en Afrique sur MIYASHI." canonical="/freelance" />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <PageHero
          eyebrow="Freelance & Emplois"
          title="Le talent africain, au travail"
          description="Recrutez des freelances qualifiés ou trouvez votre prochaine mission. Paiement sous séquestre, livrables suivis."
          photo={PHOTOS.phoneShopper}
          focus="object-top"
        />
        <div className="-mx-4"><SiteBanners placement="freelance_top" /></div>
        <SponsoredStrip kind="job" title="Offres à la une" />

        <Tabs value={tab} onValueChange={(v) => setParams(v === "jobs" ? { onglet: "offres" } : {}, { replace: true })} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="freelancers">Freelances</TabsTrigger>
            <TabsTrigger value="jobs"><span className="sm:hidden">Emplois & missions</span><span className="hidden sm:inline">Offres d'emploi et missions</span></TabsTrigger>
          </TabsList>
          
          <TabsContent value="freelancers" className="mt-6">
            <FreelanceProfiles />
          </TabsContent>
          
          <TabsContent value="jobs" className="mt-6">
            <JobOffers />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Freelance;
