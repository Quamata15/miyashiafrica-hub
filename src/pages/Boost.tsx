import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Zap, MapPin, Clock, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const periods = [
  { id: "weekly", label: "1 semaine", price: 2500 },
  { id: "monthly", label: "1 mois", price: 5000 },
  { id: "quarterly", label: "3 mois", price: 10000 },
  { id: "semi_annual", label: "6 mois", price: 15000 },
  { id: "annual", label: "12 mois", price: 25000 },
];

const Boost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boostType = (searchParams.get("type") || "product") as string;

  const [period, setPeriod] = useState("monthly");
  const [radius, setRadius] = useState([50]);
  const [loading, setLoading] = useState(false);

  const selectedPeriod = periods.find(p => p.id === period)!;

  const handleBoost = async () => {
    if (!user) { navigate("/auth"); return; }
    setLoading(true);

    const expiresAt = new Date();
    switch (period) {
      case "weekly": expiresAt.setDate(expiresAt.getDate() + 7); break;
      case "monthly": expiresAt.setMonth(expiresAt.getMonth() + 1); break;
      case "quarterly": expiresAt.setMonth(expiresAt.getMonth() + 3); break;
      case "semi_annual": expiresAt.setMonth(expiresAt.getMonth() + 6); break;
      case "annual": expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
    }

    const { error } = await (supabase.from("boosts") as any).insert({
      user_id: user.id,
      boost_type: boostType,
      zone_radius_km: radius[0],
      period,
      price_paid: selectedPeriod.price,
      expires_at: expiresAt.toISOString(),
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le boost", variant: "destructive" });
    } else {
      toast({ title: "Boost activé! 🚀", description: `Votre ${boostType} est maintenant boosté` });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-hero flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold">Booster votre visibilité</h1>
              <p className="text-muted-foreground mt-2">Mettez en avant votre {boostType} pour toucher plus de clients</p>
            </div>

            <Card className="border-0 shadow-elevated mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Durée du boost</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={period} onValueChange={setPeriod} className="space-y-3">
                  {periods.map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer ${period === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={p.id} id={p.id} />
                        <label htmlFor={p.id} className="cursor-pointer font-medium">{p.label}</label>
                      </div>
                      <span className="font-bold text-primary">{p.price.toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Zone de couverture</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Slider value={radius} onValueChange={setRadius} min={10} max={500} step={10} />
                  <p className="text-center text-lg font-bold text-primary">{radius[0]} km</p>
                  <p className="text-center text-sm text-muted-foreground">Rayon de visibilité autour de votre position</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card mb-6">
              <CardContent className="p-5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">{selectedPeriod.price.toLocaleString()} FCFA</span>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleBoost} disabled={loading} className="w-full h-14 text-lg bg-gradient-hero">
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              Activer le boost
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Boost;
