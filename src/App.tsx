import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { FavoritesProvider } from "@/hooks/useFavorites";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Marketplace from "./pages/Marketplace";
import Services from "./pages/Services";
import Freelance from "./pages/Freelance";
import Profile from "./pages/Profile";
import Create from "./pages/Create";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import ProductDetail from "./pages/ProductDetail";
import ServiceDetail from "./pages/ServiceDetail";
import Favorites from "./pages/Favorites";
import SearchAlerts from "./pages/SearchAlerts";
import DriverRegistration from "./pages/DriverRegistration";
import DriverDashboard from "./pages/DriverDashboard";
import DriverSelection from "./pages/DriverSelection";
import Checkout from "./pages/Checkout";
import Support from "./pages/Support";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import HelpCenter from "./pages/HelpCenter";
import ProviderSpace from "./pages/ProviderSpace";
import Boost from "./pages/Boost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/services" element={<Services />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                <Route path="/freelance" element={<Freelance />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/create" element={<Create />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/alerts" element={<SearchAlerts />} />
                <Route path="/driver-registration" element={<DriverRegistration />} />
                <Route path="/driver-dashboard" element={<DriverDashboard />} />
                <Route path="/select-driver" element={<DriverSelection />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/support" element={<Support />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/provider-space" element={<ProviderSpace />} />
                <Route path="/boost" element={<Boost />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
