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
import { Loader2, User, Briefcase, Settings } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type FreelanceProfile = Tables<"freelance_profiles">;

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [freelanceProfile, setFreelanceProfile] = useState<Partial<FreelanceProfile>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFreelanceProfile();
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        <Tabs defaultValue="personal" className="w-full max-w-2xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="freelance" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Freelance
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Mettez à jour vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
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
            <Card>
              <CardHeader>
                <CardTitle>Profil Freelance</CardTitle>
                <CardDescription>
                  Configurez votre profil pour proposer vos services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <Button onClick={handleSaveFreelanceProfile} disabled={saving}>
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres du compte</CardTitle>
                <CardDescription>
                  Gérez les paramètres de votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Email</h4>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="destructive" onClick={handleSignOut}>
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
