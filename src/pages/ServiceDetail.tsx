import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { BookingPicker, PortfolioGrid } from "@/components/commerce/Services";
import ServicePackages, { ProviderProCard } from "@/components/commerce/ServicePackages";
import { usePrefs } from "@/lib/prefs";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ReviewsList from "@/components/reviews/ReviewsList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wrench, Star, Heart, Share2, Clock, CheckCircle,
  MessageSquare, Shield, User, ChevronLeft, ChevronRight,
  Calendar, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";
import ReportDialog from "@/components/reports/ReportDialog";

type Service = Tables<"services">;

const ServiceDetail = () => {
  const { flag } = usePrefs();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [providerProfile, setProviderProfile] = useState<{ full_name: string | null; avatar_url: string | null; is_verified: boolean | null } | null>(null);

  useEffect(() => {
    if (id) fetchService();
  }, [id]);

  const fetchService = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setService(data);
      const { data: profile } = await supabase
        .from("profiles_public")
        .select("full_name, avatar_url, is_verified")
        .eq("user_id", data.provider_id)
        .single();
      if (profile) setProviderProfile(profile);
    }
    setLoading(false);
  };

  const handleOrder = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour commander",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!service) return;

    setOrdering(true);
    const { error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: service.provider_id,
      service_id: service.id,
      quantity: 1,
      total_price: service.price || 0,
      status: "pending",
      notes: orderNote,
    });

    setOrdering(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de passer la commande",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Commande passée!",
        description: "Le prestataire a été notifié de votre demande",
      });
      navigate("/dashboard");
    }
  };

  const handleContactProvider = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!service) return;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${service.provider_id}),and(participant_1.eq.${service.provider_id},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: service.provider_id,
        })
        .select("id")
        .single();

      if (!error && newConv) {
        navigate(`/messages?conversation=${newConv.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="aspect-video rounded-2xl" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div>
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Service non trouvé</h2>
            <p className="text-muted-foreground mb-4">Ce service n'existe pas ou a été supprimé</p>
            <Button onClick={() => navigate("/services")}>
              Retour aux services
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const images = service.images?.length ? service.images : [null];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead
        title={service.title}
        description={service.description?.slice(0, 155) || `${service.title} sur MIYASHI`}
        canonical={`/service/${service.id}`}
        type="product"
        image={service.images?.[0] || undefined}
        price={service.price || undefined}
        currency="XOF"
        breadcrumbs={[
          { name: "Accueil", url: "/" },
          { name: "Services", url: "/services" },
          { name: service.title, url: `/service/${service.id}` },
        ]}
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate("/")} className="hover:text-foreground">Accueil</button>
            <span>/</span>
            <button onClick={() => navigate("/services")} className="hover:text-foreground">Services</button>
            <span>/</span>
            <span className="text-foreground">{service.title}</span>
          </nav>

          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative aspect-video rounded-2xl overflow-hidden bg-muted shadow-card"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    {images[activeImage] ? (
                      <img
                        src={images[activeImage]}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                        <Wrench className="h-24 w-24 text-secondary" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={() => setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={() => setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Quick Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={isFavorite ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4"} />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Price Type Badge */}
                <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">
                  {service.price_type === "fixed" ? "Prix fixe" : "À négocier"}
                </Badge>
              </motion.div>

              {/* Title & Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                  {service.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                    <span className="text-muted-foreground ml-1">(0 avis)</span>
                  </div>
                  {service.delivery_days && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Livraison en {service.delivery_days} jours</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Description */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Description du service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {service.description || "Aucune description disponible pour ce service."}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Packs and the provider's professional profile (real data, no generic promises) */}
              <ServicePackages serviceId={service.id} providerId={service.provider_id} />
              <ProviderProCard providerId={service.provider_id} />

              {/* Report */}
              <div className="flex justify-end">
                <ReportDialog targetType="service" targetId={service.id} />
              </div>

              {/* Reviews Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-display font-bold mb-6">Avis clients</h2>
                <ReviewsList serviceId={service.id} sellerId={service.provider_id} />
                <div className="mt-10"><PortfolioGrid userId={service.provider_id} /></div>
                {user && (
                  <div className="mt-6">
                    <ReviewForm serviceId={service.id} onSuccess={() => {}} />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="border-0 shadow-elevated sticky top-24">
                  <CardContent className="p-6 space-y-6">
                    {/* Price */}
                    <div className="text-center py-4 border-b">
                      {service.price ? (
                        <>
                          <span className="text-4xl font-bold text-secondary">
                            {service.price.toLocaleString()}
                          </span>
                          <span className="text-lg text-muted-foreground ml-2">FCFA</span>
                        </>
                      ) : (
                        <span className="text-lg text-muted-foreground">Prix sur demande</span>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="space-y-3">
                      {service.delivery_days && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Délai de livraison</span>
                          </div>
                          <span className="font-medium">{service.delivery_days} jours</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          <span>Type</span>
                        </div>
                        <span className="font-medium">
                          {service.price_type === "fixed" ? "Prix fixe" : "Négociable"}
                        </span>
                      </div>
                    </div>

                    {flag("bookings") && <BookingPicker serviceId={service.id} price={service.price} providerId={service.provider_id} />}

                    {/* Order Notes */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Décrivez votre besoin (optionnel)
                      </label>
                      <Textarea
                        placeholder="Parlez-nous de votre projet..."
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        className="w-full rounded-xl"
                        onClick={handleOrder}
                        disabled={ordering}
                      >
                        {ordering ? "Commande en cours..." : "Commander ce service"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="w-full rounded-xl"
                        onClick={handleContactProvider}
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Contacter le prestataire
                      </Button>
                    </div>

                    {/* Trust */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                      <Shield className="h-4 w-4" />
                      <span>Paiement sécurisé • Garantie satisfaction</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Provider Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={providerProfile?.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xl">
                          {providerProfile?.full_name?.charAt(0) || <User className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{providerProfile?.full_name || "Prestataire"}</h4>
                          {providerProfile?.is_verified && (
                            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                              <CheckCircle className="h-3 w-3 mr-0.5" />Vérifié
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span>5.0 (0 avis)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      {providerProfile?.is_verified && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-accent" />
                          <span>Identité vérifiée</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Répond en 24h</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleContactProvider}
                    >
                      Voir le profil
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceDetail;
