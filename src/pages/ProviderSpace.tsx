import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Star, TrendingUp, DollarSign, Package, Settings, Zap } from "lucide-react";
import { motion } from "framer-motion";

const ProviderSpace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [servRes, ordRes, subRes] = await Promise.all([
      supabase.from("services").select("*").eq("provider_id", user.id),
      supabase.from("orders").select("*").eq("seller_id", user.id).not("service_id", "is", null),
      (supabase.from("user_subscriptions") as any).select("*, plan:subscription_plans(*)").eq("user_id", user.id).maybeSingle(),
    ]);
    if (servRes.data) setServices(servRes.data);
    if (ordRes.data) setOrders(ordRes.data);
    if (subRes.data) setSubscription(subRes.data);
  };

  const revenue = orders.reduce((s, o) => s + Number(o.total_price), 0);

  const stats = [
    { label: "Services actifs", value: services.filter(s => s.is_active).length, icon: Briefcase },
    { label: "Commandes", value: orders.length, icon: Package },
    { label: "Revenus", value: `${revenue.toLocaleString()}F`, icon: DollarSign },
    { label: "Abonnement", value: subscription?.status === "active" ? "Actif" : "Inactif", icon: Star },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-display font-bold">Espace Prestataire</h1>
                <p className="text-muted-foreground">Gérez vos services et votre activité</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/create?type=service")}>+ Nouveau service</Button>
                <Button className="bg-gradient-hero" onClick={() => navigate("/boost?type=service")}>
                  <Zap className="w-4 h-4 mr-2" /> Booster
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <s.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Tabs defaultValue="services" className="space-y-6">
              <TabsList className="grid grid-cols-3 h-auto p-1 bg-muted/50">
                <TabsTrigger value="services">Mes Services</TabsTrigger>
                <TabsTrigger value="orders">Commandes</TabsTrigger>
                <TabsTrigger value="subscription">Abonnement</TabsTrigger>
              </TabsList>

              <TabsContent value="services">
                <div className="grid gap-4">
                  {services.length === 0 ? (
                    <Card className="border-0 shadow-card"><CardContent className="p-12 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">Aucun service</p>
                      <Button onClick={() => navigate("/create?type=service")}>Créer votre premier service</Button>
                    </CardContent></Card>
                  ) : services.map(s => (
                    <Card key={s.id} className="border-0 shadow-card">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{s.title}</h3>
                          <p className="text-sm text-muted-foreground">{s.price?.toLocaleString()} FCFA</p>
                        </div>
                        <Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Actif" : "Inactif"}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="orders">
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <Card className="border-0 shadow-card"><CardContent className="p-12 text-center text-muted-foreground">Aucune commande</CardContent></Card>
                  ) : orders.map(o => (
                    <Card key={o.id} className="border-0 shadow-card">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">Commande #{o.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{o.total_price.toLocaleString()} FCFA</p>
                        </div>
                        <Badge>{o.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="subscription">
                <Card className="border-0 shadow-elevated">
                  <CardHeader>
                    <CardTitle>Abonnement Prestataire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {[
                        { name: "Petite Entreprise", price: "10 000", tier: "small" },
                        { name: "Moyenne Entreprise", price: "20 000", tier: "medium" },
                        { name: "Grande Entreprise", price: "35 000", tier: "large" },
                      ].map(plan => (
                        <Card key={plan.tier} className={`border-2 ${subscription?.plan?.tier === plan.tier ? "border-primary" : "border-border"}`}>
                          <CardContent className="p-6 text-center">
                            <h3 className="font-display font-bold text-lg mb-2">{plan.name}</h3>
                            <p className="text-3xl font-bold text-primary mb-1">{plan.price}</p>
                            <p className="text-sm text-muted-foreground mb-4">FCFA / an</p>
                            <Button variant={subscription?.plan?.tier === plan.tier ? "default" : "outline"} className="w-full">
                              {subscription?.plan?.tier === plan.tier ? "Actif" : "Souscrire"}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderSpace;
