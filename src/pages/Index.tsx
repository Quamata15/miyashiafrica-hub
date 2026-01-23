import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import StatsSection from "@/components/home/StatsSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import TrustSection from "@/components/home/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <CategoriesSection />
        <FeaturedSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTASection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
