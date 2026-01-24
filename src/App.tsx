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
