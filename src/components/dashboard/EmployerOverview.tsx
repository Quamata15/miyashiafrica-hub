import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, FileText, Clock, CheckCircle, Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QuickStatsGrid from "./QuickStatsGrid";

const EmployerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("employer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("applications").select("*, job:jobs(title)").in("job_id", 
        (await supabase.from("jobs").select("id").eq("employer_id", user.id)).data?.map(j => j.id) || []
      ).order("created_at", { ascending: false }),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data);
    if (appsRes.data) setApplications(appsRes.data);
    setLoading(false);
  };

  const activeJobs = jobs.filter(j => j.is_active).length;
  const pendingApps = applications.filter(a => a.status === "pending").length;

  const stats = [
    { label: "Offres publiées", value: jobs.length, icon: Briefcase },
    { label: "Offres actives", value: activeJobs, icon: CheckCircle },
    { label: "Candidatures reçues", value: applications.length, icon: FileText },
    { label: "En attente", value: pendingApps, icon: Clock, trend: pendingApps > 0 ? "up" as const : "neutral" as const },
  ];

  const statusLabel: Record<string, string> = {
    pending: "En attente", accepted: "Acceptée", rejected: "Refusée"
  };
  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground", accepted: "bg-accent text-accent-foreground",
    rejected: "bg-destructive/10 text-destructive"
  };

  const handleUpdateApplication = async (appId: string, status: string) => {
    await supabase.from("applications").update({ status }).eq("id", appId);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <QuickStatsGrid stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mes offres</CardTitle>
              <Button size="sm" onClick={() => navigate("/create?type=job")} className="bg-primary">
                <Plus className="w-3 h-3 mr-1" /> Publier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucune offre publiée</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/create?type=job")}>
                  Publier une offre
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {jobs.slice(0, 5).map((job) => {
                  const jobApps = applications.filter(a => a.job_id === job.id).length;
                  return (
                    <div key={job.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.budget_min && job.budget_max ? `${job.budget_min.toLocaleString()} - ${job.budget_max.toLocaleString()}F` : "Budget flexible"} • {jobApps} candidature{jobApps !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant={job.is_active ? "default" : "outline"} className="text-xs">
                        {job.is_active ? "Active" : "Fermée"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications received */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Candidatures reçues
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Aucune candidature reçue</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {applications.slice(0, 6).map((app) => (
                  <div key={app.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{app.job?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.proposed_rate ? `${app.proposed_rate.toLocaleString()}F proposé` : ""} • {format(new Date(app.created_at), "dd MMM", { locale: fr })}
                        </p>
                      </div>
                      <Badge className={`text-xs ${statusColor[app.status] || ""}`}>
                        {statusLabel[app.status] || app.status}
                      </Badge>
                    </div>
                    {app.cover_letter && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{app.cover_letter}</p>
                    )}
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleUpdateApplication(app.id, "accepted")}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Accepter
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => handleUpdateApplication(app.id, "rejected")}>
                          Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployerOverview;
