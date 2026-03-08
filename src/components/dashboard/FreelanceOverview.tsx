import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Briefcase, FileText, Clock, CheckCircle, Eye, Send, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QuickStatsGrid from "./QuickStatsGrid";

const FreelanceOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profRes, appRes] = await Promise.all([
      supabase.from("freelance_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("applications").select("*, job:jobs(title, employer_id, budget_min, budget_max)").eq("freelance_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (profRes.data) setProfile(profRes.data);
    if (appRes.data) setApplications(appRes.data);
    setLoading(false);
  };

  const pendingApps = applications.filter(a => a.status === "pending");
  const acceptedApps = applications.filter(a => a.status === "accepted");
  const profileComplete = profile ? [profile.title, profile.skills?.length, profile.hourly_rate, profile.bio].filter(Boolean).length : 0;
  const completionPct = Math.round((profileComplete / 4) * 100);

  const stats = [
    { label: "Candidatures", value: applications.length, icon: Send },
    { label: "En attente", value: pendingApps.length, icon: Clock, trend: pendingApps.length > 0 ? "up" as const : "neutral" as const },
    { label: "Acceptées", value: acceptedApps.length, icon: CheckCircle },
    { label: "Taux horaire", value: profile?.hourly_rate ? `${profile.hourly_rate.toLocaleString()}F` : "—", icon: DollarSign },
  ];

  const statusLabel: Record<string, string> = {
    pending: "En attente", accepted: "Acceptée", rejected: "Refusée", withdrawn: "Retirée"
  };
  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground", accepted: "bg-accent text-accent-foreground",
    rejected: "bg-destructive/10 text-destructive", withdrawn: "bg-muted text-muted-foreground"
  };

  return (
    <div className="space-y-6">
      {/* Profile completion */}
      {completionPct < 100 && (
        <Card className="border-0 shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Complétez votre profil</span>
              </div>
              <span className="text-sm font-bold text-primary">{completionPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Un profil complet reçoit 3x plus de réponses</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/profile?tab=freelance")}>
              Compléter
            </Button>
          </CardContent>
        </Card>
      )}

      <QuickStatsGrid stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mes candidatures</CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate("/freelance")}>
                <Eye className="w-3 h-3 mr-1" /> Offres
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucune candidature</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/freelance")}>
                  Voir les offres
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {applications.slice(0, 6).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{app.job?.title || "Offre"}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.proposed_rate ? `${app.proposed_rate.toLocaleString()}F proposé` : ""} • {format(new Date(app.created_at), "dd MMM", { locale: fr })}
                      </p>
                    </div>
                    <Badge className={`text-xs ${statusColor[app.status] || ""}`}>
                      {statusLabel[app.status] || app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills & Info */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mon profil freelance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.title && (
              <div>
                <p className="text-xs text-muted-foreground">Titre</p>
                <p className="font-medium">{profile.title}</p>
              </div>
            )}
            {profile?.skills?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Compétences</p>
                <div className="flex flex-wrap gap-1">
                  {profile.skills.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile?.experience_years != null && (
              <div>
                <p className="text-xs text-muted-foreground">Expérience</p>
                <p className="font-medium">{profile.experience_years} ans</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/profile?tab=freelance")}>
              Modifier le profil
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FreelanceOverview;
