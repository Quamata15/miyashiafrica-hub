import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, MapPin, Bike, Car, Shield, Star, 
  CheckCircle, ArrowRight, Loader2, DollarSign 
} from "lucide-react";
import DriverContract from "@/components/driver/DriverContract";
import PageHero from "@/components/layout/PageHero";
import { PHOTOS } from "@/lib/photos";
import { useSpaces } from "@/hooks/useSpaces";

const DriverRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const sp = useSpaces();
  const driverOption = sp.option("driver");
  const blocked = !!user && !sp.loading && !sp.has("driver") && driverOption && !driverOption.available;
  const [form, setForm] = useState({
    zone: "Lomé",
    vehicle_type: "moto",
    license_number: "",
    phone: "",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // One call: checks the space rules (no seller account, 3 spaces at most), then saves the driver profile.
      const { error } = await supabase.rpc("register_driver", {
        p_zone: form.zone, p_vehicle: form.vehicle_type, p_license: form.license_number || undefined,
        p_phone: form.phone || undefined, p_bio: form.bio || undefined,
      });
      if (error) throw new Error(error.message.replace(/^.*?ERROR:\s*/i, "").replace(/\s*CONTEXT:.*$/s, ""));
      await sp.refresh();

      toast({
        title: "Inscription réussie ! 🎉",
        description: "Bienvenue dans l'équipe MIYASHI. Vous pouvez maintenant accepter des livraisons.",
      });
      navigate("/dashboard?espace=livreur&onglet=guide");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de compléter l'inscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: DollarSign, title: "550 FCFA/km", desc: "Tarif de base par kilomètre" },
    { icon: Star, title: "Badges de fidélité", desc: "Bronze → Argent → Or" },
    { icon: Shield, title: "Paiement sécurisé", desc: "Fonds bloqués puis libérés" },
    { icon: MapPin, title: "Zone flexible", desc: "Travaillez dans votre zone" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero */}
          <PageHero eyebrow="Livreurs" title="Devenez livreur MIYASHI" photo={PHOTOS.motoGoods}
            description="Livrez dans votre zone, choisissez vos horaires, soyez payé dès que le client confirme la réception." />

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            {benefits.map((b, i) => (
              <Card key={i} className="border-0 shadow-card text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Pricing Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            <Card className="border-0 shadow-card overflow-hidden">
              <div className="bg-gradient-hero p-6 text-primary-foreground">
                <h2 className="text-2xl font-display font-bold mb-2">Tarification</h2>
                <p className="opacity-90">Transparente et avantageuse</p>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">550F</p>
                    <p className="text-xs text-muted-foreground">Moto /km</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">1000F</p>
                    <p className="text-xs text-muted-foreground">Tricycle /km</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">1500F</p>
                    <p className="text-xs text-muted-foreground">Voiture /km</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">2000F</p>
                    <p className="text-xs text-muted-foreground">Camionnette /km</p>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">Commission plateforme : 18% fixe • Majoration +25% après 19H GMT</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contract & Badge */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <DriverContract />
            </motion.div>
          )}

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-0 shadow-elevated">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Formulaire d'inscription</CardTitle>
                <CardDescription>
                  Remplissez vos informations pour rejoindre l'équipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sp.has("driver") && !sp.isAdmin ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm">
                    Vous êtes déjà livreur MIYASHI. <Button variant="link" className="px-1" onClick={() => navigate("/dashboard?espace=livreur")}>Ouvrir l'espace Livreur</Button>
                  </div>
                ) : blocked ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm space-y-2">
                    <p className="font-medium">Inscription impossible avec ce compte</p>
                    <p className="text-muted-foreground">{driverOption?.reason}</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard?gerer=1")}>Gérer mes espaces</Button>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Zone de livraison</Label>
                      <Select value={form.zone} onValueChange={(v) => setForm({ ...form, zone: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lomé">Lomé</SelectItem>
                          <SelectItem value="Kpalimé">Kpalimé</SelectItem>
                          <SelectItem value="Sokodé">Sokodé</SelectItem>
                          <SelectItem value="Kara">Kara</SelectItem>
                          <SelectItem value="Atakpamé">Atakpamé</SelectItem>
                          <SelectItem value="Dapaong">Dapaong</SelectItem>
                          <SelectItem value="Tsévié">Tsévié</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type de véhicule</Label>
                      <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moto">
                            <div className="flex items-center gap-2">
                              <Bike className="w-4 h-4" /> Moto - 550F/km
                            </div>
                          </SelectItem>
                          <SelectItem value="tricycle">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" /> Tricycle - 1000F/km
                            </div>
                          </SelectItem>
                          <SelectItem value="voiture">
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4" /> Voiture - 1500F/km
                            </div>
                          </SelectItem>
                          <SelectItem value="camionnette">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" /> Camionnette - 2000F/km
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Numéro de permis (optionnel)</Label>
                      <Input
                        placeholder="Votre numéro de permis"
                        value={form.license_number}
                        onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        placeholder="+228 XX XX XX XX"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Présentation (optionnel)</Label>
                    <Textarea
                      placeholder="Décrivez votre expérience en livraison..."
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg bg-gradient-hero" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Inscription en cours...</>
                    ) : (
                      <>S'inscrire comme livreur <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverRegistration;
