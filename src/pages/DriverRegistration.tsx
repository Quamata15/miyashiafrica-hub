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
import { StickySubmit } from "@/components/forms/FormBits";
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
      // One call: checks the space rules (3 spaces at most), then saves the driver profile.
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
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <PageHero compact eyebrow="Livreurs" title="Devenez livreur MIYASHI" photo={PHOTOS.motoGoods}
            description="Livrez dans votre zone, choisissez vos horaires, soyez payé dès que le client confirme la réception." />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="space-y-4 min-w-0 order-last lg:order-first">
            <div className="grid grid-cols-2 gap-2">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card/70 p-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm leading-tight">{b.title}</h3>
                    <p className="text-xs text-muted-foreground leading-snug">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="border-0 shadow-card overflow-hidden">
              <div className="bg-gradient-hero px-4 py-2.5 text-primary-foreground flex items-baseline justify-between gap-2">
                <h2 className="font-display font-bold">Tarification</h2>
                <p className="text-xs opacity-90">Transparente et avantageuse</p>
              </div>
              <CardContent className="p-3 sm:p-3">
                <div className="grid grid-cols-4 gap-2">
                  {[["550F", "Moto"], ["1000F", "Tricycle"], ["1500F", "Voiture"], ["2000F", "Camionnette"]].map(([price, label]) => (
                    <div key={label} className="text-center p-2 rounded-lg bg-muted/50 min-w-0">
                      <p className="text-base sm:text-lg font-bold text-primary">{price}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{label} /km</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Commission plateforme : 18 % fixe · majoration de 25 % après 19 h GMT</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-elevated min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Formulaire d'inscription</CardTitle>
                <CardDescription>Remplissez vos informations pour rejoindre l'équipe</CardDescription>
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
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
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

                    <div className="space-y-1.5">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Permis (optionnel)</Label>
                      <Input
                        placeholder="N° de permis"
                        value={form.license_number}
                        onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input
                        placeholder="+228 XX XX XX XX"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Présentation (optionnel)</Label>
                    <Textarea
                      placeholder="Décrivez votre expérience en livraison..."
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={2}
                      className="min-h-[64px]"
                    />
                  </div>

                  <StickySubmit>
                  <Button type="submit" className="w-full h-11 text-base bg-gradient-hero" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Inscription en cours...</>
                    ) : (
                      <>S'inscrire comme livreur <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                  </StickySubmit>
                </form>
                )}
              </CardContent>
          </Card>
          </div>

          {user && (
            <div className="mt-4">
              <DriverContract />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverRegistration;
