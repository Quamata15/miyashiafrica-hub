import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Flag, CheckCircle, XCircle, Eye, User, Loader2, ShoppingBag, Wrench, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminReportsPanelProps {
  reports: Report[];
  onRefresh: () => void;
}

const TARGET_ICONS: Record<string, typeof Flag> = {
  product: ShoppingBag,
  service: Wrench,
  review: MessageSquare,
  user: User,
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Contenu inapproprié",
  fraud: "Fraude / Arnaque",
  counterfeit: "Contrefaçon",
  harassment: "Harcèlement",
  other: "Autre",
};

const AdminReportsPanel = ({ reports, onRefresh }: AdminReportsPanelProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const pendingReports = reports.filter(r => r.status === "pending");
  const resolvedReports = reports.filter(r => r.status !== "pending");

  const handleUpdateStatus = async (reportId: string, status: string) => {
    setProcessing(reportId);
    try {
      await (supabase.from("reports") as any).update({
        status,
        admin_notes: adminNotes[reportId] || null,
        updated_at: new Date().toISOString(),
      }).eq("id", reportId);

      toast({ title: `Signalement ${status === "resolved" ? "traité" : "rejeté"}` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending reports */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-secondary" />
            Signalements en attente ({pendingReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucun signalement en attente ✅</p>
          ) : (
            <div className="space-y-4">
              {pendingReports.map(report => {
                const Icon = TARGET_ICONS[report.target_type] || Flag;
                return (
                  <Card key={report.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-secondary" />
                            <Badge variant="outline" className="text-xs capitalize">{report.target_type}</Badge>
                            <Badge className="text-xs">{REASON_LABELS[report.reason] || report.reason}</Badge>
                          </div>
                          {report.description && (
                            <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Cible: {report.target_id.slice(0, 12)}... • Par: {report.reporter_id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>

                      <Textarea
                        placeholder="Notes admin..."
                        className="text-xs min-h-0 h-9 resize-none"
                        value={adminNotes[report.id] || ""}
                        onChange={e => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={processing === report.id}
                          onClick={() => handleUpdateStatus(report.id, "resolved")}
                        >
                          {processing === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Traiter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing === report.id}
                          onClick={() => handleUpdateStatus(report.id, "dismissed")}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Rejeter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved reports */}
      {resolvedReports.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Signalements traités ({resolvedReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedReports.slice(0, 20).map(report => (
                <div key={report.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-sm">
                  {report.status === "resolved" ? (
                    <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 capitalize">{report.target_type} • {REASON_LABELS[report.reason] || report.reason}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(report.created_at), "dd/MM", { locale: fr })}</span>
                  <Badge variant={report.status === "resolved" ? "default" : "secondary"} className="text-xs">
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReportsPanel;
