import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import StatsSection from "@/components/home/StatsSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CTASection from "@/components/home/CTASection";
import TrustSection from "@/components/home/TrustSection";
import { SiteBanners } from "@/components/home/SiteBanners";
import { Recommendations, RecentlyViewed } from "@/components/commerce/ProductTiles";

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect logged-in users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <SEOHead canonical="/" />
      <Header />
      <main>
        <HeroSection />
        <SiteBanners placement="home_top" />
        <StatsSection />
        <CategoriesSection />
        <FeaturedSection />
        <div className="container mx-auto px-4"><RecentlyViewed /><Recommendations title="Populaires en ce moment" /></div>
        <SiteBanners placement="home_middle" />
        <HowItWorksSection />
        <CTASection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
