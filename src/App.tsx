import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { FavoritesProvider } from "@/hooks/useFavorites";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SpacesProvider } from "@/hooks/useSpaces";
import { RequireSpace } from "@/components/spaces/SpaceAccess";
import { PrefsProvider } from "@/lib/prefs";
import { I18nProvider } from "@/lib/i18n";
import CookieConsent from "@/components/layout/CookieConsent";
import { AnnouncementBar } from "@/components/home/SiteBanners";
import NetworkStatus from "@/components/layout/NetworkStatus";
import { MfaGate } from "@/components/security/Mfa";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Services = lazy(() => import("./pages/Services"));
const Freelance = lazy(() => import("./pages/Freelance"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));
const AiInterview = lazy(() => import("./pages/AiInterview"));
const ProviderInvoicePage = lazy(() => import("./pages/ProviderInvoicePage"));
const Profile = lazy(() => import("./pages/Profile"));
const Create = lazy(() => import("./pages/Create"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Messages = lazy(() => import("./pages/Messages"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SearchAlerts = lazy(() => import("./pages/SearchAlerts"));
const DriverRegistration = lazy(() => import("./pages/DriverRegistration"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverSelection = lazy(() => import("./pages/DriverSelection"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Support = lazy(() => import("./pages/Support"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const ProviderSpace = lazy(() => import("./pages/ProviderSpace"));
const Boost = lazy(() => import("./pages/Boost"));
const Wallet = lazy(() => import("./pages/Wallet"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Disputes = lazy(() => import("./pages/Disputes"));
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const UserFollows = lazy(() => import("./pages/UserFollows"));
const Feed = lazy(() => import("./pages/Feed"));
const HelpGuide = lazy(() => import("./pages/HelpGuide"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Invoice = lazy(() => import("./pages/Invoice"));
const Savings = lazy(() => import("./pages/Savings"));
const Offers = lazy(() => import("./pages/Offers"));
const Addresses = lazy(() => import("./pages/Addresses"));
const Compare = lazy(() => import("./pages/Compare"));
const Shop = lazy(() => import("./pages/Shop"));
const ShopManage = lazy(() => import("./pages/ShopManage"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Status = lazy(() => import("./pages/Status"));
const PickupPartner = lazy(() => import("./pages/PickupPartner"));
const Settings = lazy(() => import("./pages/Settings"));
const BecomePickupPoint = lazy(() => import("./pages/BecomePickupPoint"));

// Retries with backoff and offline-first behaviour for slow mobile networks (#13).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000), staleTime: 30_000, refetchOnWindowFocus: false, networkMode: "offlineFirst" },
    mutations: { networkMode: "offlineFirst" },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SpacesProvider>
        <PrefsProvider>
        <I18nProvider>
        <CartProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnnouncementBar />
                <CookieConsent />
                <NetworkStatus />
                <MfaGate />
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/oauth/consent" element={<OAuthConsent />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/service/:id" element={<ServiceDetail />} />
                    <Route path="/freelance" element={<Freelance />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="/help/:slug" element={<HelpGuide />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/user/:userId" element={<PublicProfile />} />
                    <Route path="/user/:userId/follows" element={<UserFollows />} />
                    <Route path="/driver-registration" element={<DriverRegistration />} />
                    <Route path="/boutique/:slug" element={<Shop />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/status" element={<Status />} />
                    <Route path="/devenir-point-relais" element={<BecomePickupPoint />} />

                    {/* Protected routes */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                    <Route path="/alerts" element={<ProtectedRoute><SearchAlerts /></ProtectedRoute>} />
                    <Route path="/driver-dashboard" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
                    <Route path="/select-driver" element={<ProtectedRoute><DriverSelection /></ProtectedRoute>} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/provider-space" element={<ProtectedRoute><ProviderSpace /></ProtectedRoute>} />
                    <Route path="/boost" element={<ProtectedRoute><RequireSpace feature="boost"><Boost /></RequireSpace></ProtectedRoute>} />
                    <Route path="/campaigns" element={<ProtectedRoute><RequireSpace feature="boost"><Campaigns /></RequireSpace></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                    <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
                    <Route path="/feed" element={<Feed />} />
                    <Route path="/checkout/return" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
                    <Route path="/invoice/:orderId" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
                    <Route path="/savings" element={<ProtectedRoute><Savings /></ProtectedRoute>} />
                    <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
                    <Route path="/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
                    <Route path="/shop/manage" element={<ProtectedRoute><ShopManage /></ProtectedRoute>} />
                    <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                    <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
                    <Route path="/entretien/:id" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
                    <Route path="/entretien-ia/:id" element={<ProtectedRoute><AiInterview /></ProtectedRoute>} />
                    <Route path="/facture/:id" element={<ProtectedRoute><ProviderInvoicePage /></ProtectedRoute>} />
                    <Route path="/pickup-partner" element={<ProtectedRoute><PickupPartner /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </FavoritesProvider>
        </CartProvider>
        </I18nProvider>
        </PrefsProvider>
        </SpacesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
