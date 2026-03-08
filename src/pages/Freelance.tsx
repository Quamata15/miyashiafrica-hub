import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FreelanceProfiles from "@/components/freelance/FreelanceProfiles";
import JobOffers from "@/components/freelance/JobOffers";

const Freelance = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Freelance & Emplois</h1>
          <p className="text-lg text-muted-foreground">
            Trouvez des freelances qualifiés ou des opportunités d'emploi
          </p>
        </div>

        <Tabs defaultValue="freelancers" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="freelancers">Freelances</TabsTrigger>
            <TabsTrigger value="jobs">Offres d'emploi</TabsTrigger>
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
