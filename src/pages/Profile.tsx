import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, User, Briefcase, Settings, ShoppingBag, Package,
  MessageSquare, Star, LayoutDashboard, Bell, Camera, MapPin,
  Phone, Mail, CheckCircle, TrendingUp, LogOut, Shield, Lock, Upload, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import KYCVerification from "@/components/kyc/KYCVerification";
import ThemeToggle from "@/components/theme/ThemeToggle";
import PushNotificationToggle from "@/components/notifications/PushNotificationToggle";
import ReferralCard from "@/components/referral/ReferralCard";
import { useSpaces, ROLE_LABEL } from "@/hooks/useSpaces";
import { AddSpaceDialog } from "@/components/spaces/SpaceSwitcher";
import { SPACES } from "@/components/spaces/registry";
import { compressImage } from "@/lib/upload";

type ProfileType = Tables<"profiles">;
type FreelanceProfile = Tables<"freelance_profiles">;
const USERNAME = /^[a-z0-9][a-z0-9._]{2,29}$/;
const clean = (m: string) => m.replace(/^.*?ERROR:\s*/i, "").replace(/\s*CONTEXT:.*$/s, "");

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<Partial<ProfileType>>({});
  const [freelanceProfile, setFreelanceProfile] = useState<Partial<FreelanceProfile>>({});
  const sp = useSpaces();
  const userRoles = sp.roles.filter((r) => (r as string) !== "admin");
  const [managing, setManaging] = useState(false);
  const [stats, setStats] = useState({ orders: 0, products: 0, services: 0, reviews: 0 });

  useEffect(() => {
    if (user) {
      Promise.all([fetchProfile(), fetchFreelanceProfile(), fetchStats()]);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setProfile(data);
  };

  const fetchFreelanceProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("freelance_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setFreelanceProfile(data);
  };

  const fetchStats = async () => {
    if (!user) return;
    const [o, p, s, r] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_id", user.id),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", user.id),
    ]);
    setStats({ orders: o.count || 0, products: p.count || 0, services: s.count || 0, reviews: r.count || 0 });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const fullName = (profile.full_name ?? "").trim().replace(/\s+/g, " ");
    const username = ((profile as any).username ?? "").trim().toLowerCase();
    if (fullName.length < 2 || fullName.length > 80) { toast({ title: "Nom invalide", description: "Entre 2 et 80 caractères.", variant: "destructive" }); return; }
    if (username && !USERNAME.test(username)) { toast({ title: "Pseudonyme invalide", description: "3 à 30 caractères : lettres minuscules, chiffres, point ou tiret bas.", variant: "destructive" }); return; }
    setSaving(true);
    // The profile row is created at sign-up: update it (an upsert without its id inserted a duplicate and always failed).
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, username: username || null,
      phone: profile.phone?.trim() || null, location: profile.location?.trim() || null, bio: profile.bio?.trim() || null,
    }).eq("user_id", user.id);
    const taken = error?.code === "23505";
    toast(error ? { title: taken ? "Pseudonyme déjà pris" : "Erreur", description: taken ? "Choisissez-en un autre." : clean(error.message), variant: "destructive" }
                : { title: "Profil mis à jour", description: "Votre nouveau nom apparaît partout sur MIYASHI." });
    if (!error) { setProfile({ ...profile, full_name: fullName, username: username || null } as Partial<ProfileType>); window.dispatchEvent(new Event("miyashi:profile-updated")); }
    setSaving(false);
  };

  const handleSaveFreelance = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("freelance_profiles").upsert({
      user_id: user.id, title: freelanceProfile.title, skills: freelanceProfile.skills,
      hourly_rate: freelanceProfile.hourly_rate, experience_years: freelanceProfile.experience_years,
      availability: freelanceProfile.availability,
    }, { onConflict: "user_id" });
    toast(error ? { title: "Erreur", description: clean(error.message), variant: "destructive" }
                : { title: "Succès", description: "Profil freelance mis à jour" });
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw || !user) return;
    if (!/^image\/(jpeg|png|webp)$/.test(raw.type)) { toast({ title: "Format non pris en charge", description: "JPG, PNG ou WebP.", variant: "destructive" }); return; }
    setUploadingAvatar(true);
    const file = await compressImage(raw, 800, 0.85);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      toast({ title: "Erreur", description: clean(uploadError.message), variant: "destructive" });
    } else {
      // A new file name each time, so browsers and caches show the new photo at once.
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (error) toast({ title: "Erreur", description: clean(error.message), variant: "destructive" });
      else { setProfile({ ...profile, avatar_url: publicUrl }); toast({ title: "Photo mise à jour" }); window.dispatchEvent(new Event("miyashi:profile-updated")); }
    }
    e.target.value = "";
    setUploadingAvatar(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit faire au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mot de passe mis à jour" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-warm"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Only show stats relevant to the user's roles
  const relevantStats = [
    { label: "Commandes", value: stats.orders, icon: ShoppingBag, show: true },
    { label: "Produits", value: stats.products, icon: Package, show: userRoles.includes("seller") || stats.products > 0 },
    { label: "Services", value: stats.services, icon: Briefcase, show: userRoles.includes("provider") || stats.services > 0 },
    { label: "Avis donnés", value: stats.reviews, icon: Star, show: true },
  ].filter(s => s.show);

  // Only show freelance tab if user has freelance role
  const showFreelance = sp.can("apply");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Mon profil" description="Gérez votre profil MIYASHI" canonical="/profile" />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile Header - Compact */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card p-4 sm:p-5 mb-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 border-3 border-primary/20">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xl font-bold">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md" asChild>
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </Button>
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-display font-bold break-words">{profile.full_name || "Utilisateur"}</h1>
                  {profile.is_verified && <Badge className="bg-accent text-accent-foreground text-xs"><CheckCircle className="h-3 w-3 mr-0.5" />Vérifié</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {user?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>}
                  {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>}
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sp.isAdmin && <Badge className="text-xs">Administrateur</Badge>}
                  {userRoles.map(role => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {ROLE_LABEL[role] || role}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 mr-1" /> Tableau de bord
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats - Only relevant ones */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-2 mb-3">
            {relevantStats.map(stat => (
              <Card key={stat.label} className="border-0 shadow-soft">
                <CardContent className="p-2 sm:p-3 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left">
                  <div className="hidden sm:flex w-8 h-8 shrink-0 rounded-lg bg-primary/10 items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Tabs - Contextual */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Tabs defaultValue={searchParams.get("tab") === "verification" ? "verification" : "personal"} className="w-full">
              <TabsList className={`grid w-full mb-3 ${showFreelance ? "grid-cols-5" : "grid-cols-4"}`}>
                <TabsTrigger value="personal"><User className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Personnel</span></TabsTrigger>
                {showFreelance && <TabsTrigger value="freelance"><Briefcase className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Freelance</span></TabsTrigger>}
                <TabsTrigger value="verification"><Shield className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Vérification</span></TabsTrigger>
                <TabsTrigger value="roles"><Star className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Espaces</span></TabsTrigger>
                <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Paramètres</span></TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal">
                <Card className="border-0 shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Informations personnelles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs">Pseudonyme (public)</Label>
                        <Input id="username" placeholder="mon_pseudo" value={(profile as any).username || ""} onChange={e => setProfile({...profile, username: e.target.value} as any)} />
                        <p className="text-[10px] text-muted-foreground">Affiché publiquement à la place de votre nom</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs">Nom complet</Label>
                        <Input id="fullName" placeholder="Votre nom" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs">Téléphone</Label>
                        <Input id="phone" placeholder="+228 XX XX XX XX" value={profile.phone || ""} onChange={e => setProfile({...profile, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="location" className="text-xs">Localisation</Label>
                        <Input id="location" placeholder="Lomé, Togo" value={profile.location || ""} onChange={e => setProfile({...profile, location: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bio" className="text-xs">Bio</Label>
                      <Textarea id="bio" placeholder="Parlez-nous de vous..." value={profile.bio || ""} onChange={e => setProfile({...profile, bio: e.target.value})} rows={2} />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</> : "Sauvegarder"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Freelance Tab */}
              {showFreelance && (
                <TabsContent value="freelance">
                  <Card className="border-0 shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Profil Freelance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Titre professionnel</Label>
                        <Input placeholder="ex: Développeur Web" value={freelanceProfile.title || ""} onChange={e => setFreelanceProfile({...freelanceProfile, title: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Compétences (virgules)</Label>
                        <Input placeholder="React, Node.js, TypeScript" value={freelanceProfile.skills?.join(", ") || ""} onChange={e => setFreelanceProfile({...freelanceProfile, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Taux horaire (FCFA)</Label>
                          <Input type="number" value={freelanceProfile.hourly_rate || ""} onChange={e => setFreelanceProfile({...freelanceProfile, hourly_rate: parseFloat(e.target.value) || null})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Années d'expérience</Label>
                          <Input type="number" value={freelanceProfile.experience_years || ""} onChange={e => setFreelanceProfile({...freelanceProfile, experience_years: parseInt(e.target.value) || null})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Disponibilité</Label>
                          <Select value={freelanceProfile.availability || "available"} onValueChange={v => setFreelanceProfile({...freelanceProfile, availability: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Disponible</SelectItem>
                              <SelectItem value="busy">Occupé</SelectItem>
                              <SelectItem value="not_available">Non disponible</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={handleSaveFreelance} disabled={saving}>
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</> : "Sauvegarder"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Verification Tab */}
              <TabsContent value="verification">
                <KYCVerification />
              </TabsContent>

              {/* Spaces Tab */}
              <TabsContent value="roles">
                <Card className="border-0 shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Vos espaces</CardTitle>
                    <CardDescription className="text-sm">
                      {sp.isAdmin ? "Compte administrateur : tous les espaces sont ouverts." : `L'espace Acheteur est toujours inclus, plus jusqu'à ${sp.limit} espaces professionnels compatibles (${sp.used}/${sp.limit} utilisés).`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SPACES.filter((x) => x.activation === "always" || sp.has(x.role)).map((x) => (
                        <button key={x.key} onClick={() => navigate(`/dashboard?espace=${x.key}`)} className="text-left rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-center gap-3 hover:border-primary/60 transition-colors">
                          <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><x.icon className="h-5 w-5" /></span>
                          <span className="flex-1 min-w-0"><span className="block font-medium text-sm">{x.label}</span><span className="block text-xs text-muted-foreground truncate">{x.tagline}</span></span>
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" onClick={() => setManaging(true)}>Ouvrir ou fermer un espace</Button>
                  </CardContent>
                </Card>
                <AddSpaceDialog open={managing} onOpenChange={setManaging} onActivated={(k) => navigate(`/dashboard?espace=${k}`)} />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <div className="space-y-4">
                  <Card className="border-0 shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Paramètres du compte</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Notifications push</p>
                          <p className="text-xs text-muted-foreground">Recevez des alertes pour vos commandes et messages</p>
                        </div>
                        <PushNotificationToggle />
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Settings className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Thème</p>
                          <p className="text-xs text-muted-foreground">Apparence de l'application</p>
                        </div>
                        <ThemeToggle />
                      </div>
                      <div className="pt-4 border-t flex items-center gap-3">
                        <Button variant="destructive" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                          <LogOut className="h-4 w-4 mr-1" /> Se déconnecter
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) return;
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${session?.access_token}`,
                                  "Content-Type": "application/json",
                                },
                              });
                              if (res.ok) {
                                toast({ title: "Compte supprimé", description: "Votre compte a été définitivement supprimé." });
                                await signOut();
                                navigate("/");
                              } else {
                                toast({ title: "Erreur", description: "Impossible de supprimer le compte", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Erreur", description: "Impossible de supprimer le compte", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Supprimer mon compte
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Password change */}
                  <Card className="border-0 shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="h-5 w-5" /> Changer le mot de passe
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-password" className="text-xs">Nouveau mot de passe</Label>
                        <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-password" className="text-xs">Confirmer le mot de passe</Label>
                        <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                      </div>
                      <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword}>
                        {changingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</> : "Mettre à jour"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Referral */}
                  <ReferralCard />
                </div>
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
