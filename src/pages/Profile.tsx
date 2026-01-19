import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, User, Briefcase, Settings, ShoppingBag, 
  Package, MessageSquare, Star, LayoutDashboard, Bell,
  Camera, MapPin, Phone, Mail, CheckCircle, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type FreelanceProfile = Tables<"freelance_profiles">;
type UserRole = "buyer" | "seller" | "provider" | "freelance" | "employer";

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [freelanceProfile, setFreelanceProfile] = useState<Partial<FreelanceProfile>>({});
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [stats, setStats] = useState({
    orders: 0,
    products: 0,
    services: 0,
    reviews: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFreelanceProfile();
      fetchUserRoles();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const fetchFreelanceProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("freelance_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setFreelanceProfile(data);
    }
  };

  const fetchUserRoles = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (data) {
      const roles = data.map((r) => r.role);
      setUserRoles(roles);
      if (roles.length > 0) {
        setSelectedRole(roles[0] as UserRole);
      }
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    const [ordersRes, productsRes, servicesRes, reviewsRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact" }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      supabase.from("products").select("id", { count: "exact" }).eq("seller_id", user.id),
      supabase.from("services").select("id", { count: "exact" }).eq("provider_id", user.id),
      supabase.from("reviews").select("id", { count: "exact" }).eq("reviewer_id", user.id),
    ]);

    setStats({
      orders: ordersRes.count || 0,
      products: productsRes.count || 0,
      services: servicesRes.count || 0,
      reviews: reviewsRes.count || 0,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
    }
    setSaving(false);
  };

  const handleSaveFreelanceProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("freelance_profiles")
      .upsert({
        user_id: user.id,
        title: freelanceProfile.title,
        skills: freelanceProfile.skills,
        hourly_rate: freelanceProfile.hourly_rate,
        experience_years: freelanceProfile.experience_years,
        availability: freelanceProfile.availability,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil freelance",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Profil freelance mis à jour avec succès",
      });
    }
    setSaving(false);
  };

  const handleAddRole = async (role: UserRole) => {
    if (!user || userRoles.includes(role)) return;

    const { error } = await supabase.from("user_roles").insert({
      user_id: user.id,
      role,
    });

    if (!error) {
      setUserRoles([...userRoles, role]);
      toast({
        title: "Rôle ajouté",
        description: `Vous êtes maintenant ${getRoleLabel(role)}`,
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      buyer: "Acheteur",
      seller: "Vendeur",
      provider: "Prestataire",
      freelance: "Freelance",
      employer: "Employeur",
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, typeof User> = {
      buyer: ShoppingBag,
      seller: Package,
      provider: Briefcase,
      freelance: User,
      employer: TrendingUp,
    };
    return icons[role] || User;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-card p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-hero text-primary-foreground text-3xl font-bold">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-display font-bold">
                    {profile.full_name || "Utilisateur"}
                  </h1>
                  {profile.is_verified && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                </div>
                
                {/* Roles */}
                <div className="flex flex-wrap gap-2">
                  {userRoles.map((role) => {
                    const Icon = getRoleIcon(role);
                    return (
                      <Badge 
                        key={role} 
                        variant={selectedRole === role ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedRole(role as UserRole)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {getRoleLabel(role)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate("/messages")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Commandes", value: stats.orders, icon: ShoppingBag },
              { label: "Produits", value: stats.products, icon: Package },
              { label: "Services", value: stats.services, icon: Briefcase },
              { label: "Avis donnés", value: stats.reviews, icon: Star },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Personnel</span>
                </TabsTrigger>
                <TabsTrigger value="freelance" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Freelance</span>
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Rôles</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Paramètres</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xl">Informations personnelles</CardTitle>
                    <CardDescription>
                      Mettez à jour vos informations de profil
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nom complet</Label>
                        <Input
                          id="fullName"
                          placeholder="Votre nom complet"
                          value={profile.full_name || ""}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          placeholder="+228 XX XX XX XX"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        placeholder="Lomé, Togo"
                        value={profile.location || ""}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Parlez-nous de vous..."
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        "Sauvegarder"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="freelance">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xl">Profil Freelance</CardTitle>
                    <CardDescription>
                      Configurez votre profil pour proposer vos services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titre professionnel</Label>
                      <Input
                        id="title"
                        placeholder="ex: Développeur Web Full Stack"
                        value={freelanceProfile.title || ""}
                        onChange={(e) => setFreelanceProfile({ ...freelanceProfile, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
                      <Input
                        id="skills"
                        placeholder="ex: React, Node.js, TypeScript"
                        value={freelanceProfile.skills?.join(", ") || ""}
                        onChange={(e) => setFreelanceProfile({ 
                          ...freelanceProfile, 
                          skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Taux horaire (FCFA)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          value={freelanceProfile.hourly_rate || ""}
                          onChange={(e) => setFreelanceProfile({ 
                            ...freelanceProfile, 
                            hourly_rate: parseFloat(e.target.value) || null 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Années d'expérience</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={freelanceProfile.experience_years || ""}
                          onChange={(e) => setFreelanceProfile({ 
                            ...freelanceProfile, 
                            experience_years: parseInt(e.target.value) || null 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Disponibilité</Label>
                        <Select
                          value={freelanceProfile.availability || "available"}
                          onValueChange={(value) => setFreelanceProfile({ ...freelanceProfile, availability: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="busy">Occupé</SelectItem>
                            <SelectItem value="not_available">Non disponible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSaveFreelanceProfile} disabled={saving} className="w-full sm:w-auto">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        "Sauvegarder"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xl">Gérer vos rôles</CardTitle>
                    <CardDescription>
                      Ajoutez des rôles pour accéder à plus de fonctionnalités
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(["buyer", "seller", "provider", "freelance", "employer"] as UserRole[]).map((role) => {
                        const Icon = getRoleIcon(role);
                        const isActive = userRoles.includes(role);
                        return (
                          <Card
                            key={role}
                            className={`cursor-pointer transition-all ${
                              isActive ? "border-primary bg-primary/5" : "hover:border-primary/50"
                            }`}
                            onClick={() => !isActive && handleAddRole(role)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{getRoleLabel(role)}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {isActive ? "Actif" : "Cliquer pour activer"}
                                  </p>
                                </div>
                                {isActive && (
                                  <CheckCircle className="ml-auto h-5 w-5 text-primary" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xl">Paramètres du compte</CardTitle>
                    <CardDescription>
                      Gérez les paramètres de votre compte
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Adresse email</h4>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Notifications</h4>
                          <p className="text-sm text-muted-foreground">Gérer vos préférences de notifications</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configurer
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button variant="destructive" onClick={handleSignOut}>
                        Se déconnecter
                      </Button>
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

export default Profile;
