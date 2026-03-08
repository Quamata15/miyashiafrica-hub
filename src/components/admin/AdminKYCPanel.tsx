import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Eye, FileText, Shield, User, Download,
  AlertTriangle, Clock, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface KYCDoc {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

interface AdminKYCPanelProps {
  docs: KYCDoc[];
  onRefresh: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cni_recto: "CNI - Recto",
  cni_verso: "CNI - Verso",
  passeport: "Passeport",
  selfie_verification: "Selfie de vérification",
  nif: "NIF / Registre de commerce",
  permis_conduire: "Permis de conduire",
};

const AdminKYCPanel = ({ docs, onRefresh }: AdminKYCPanelProps) => {
  const { toast } = useToast();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const pendingDocs = docs.filter(d => d.status === "pending");
  const reviewedDocs = docs.filter(d => d.status !== "pending");

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(path, 300); // 5 min signed URL
    return data?.signedUrl || null;
  };

  const handlePreview = async (docUrl: string) => {
    const url = await getDocUrl(docUrl);
    if (url) setPreviewUrl(url);
  };

  const updateStatus = async (docId: string, status: string, userId: string) => {
    setProcessing(docId);
    try {
      const updates: Record<string, any> = {
        status,
        reviewed_at: new Date().toISOString(),
      };
      if (status === "rejected") {
        updates.rejection_reason = rejectionReasons[docId] || "Document non conforme";
      }

      await supabase.from("kyc_documents").update(updates).eq("id", docId);

      // If all required docs are approved, mark profile as verified
      if (status === "approved") {
        const { data: allDocs } = await supabase
          .from("kyc_documents")
          .select("status, document_type")
          .eq("user_id", userId);

        const approvedTypes = allDocs
          ?.filter(d => d.status === "approved")
          .map(d => d.document_type) || [];
        // Include the current doc being approved
        if (!approvedTypes.includes(DOCUMENT_TYPES.find(dt => docs.find(dd => dd.id === docId)?.document_type === dt)?.toString() || "")) {
          const currentDoc = docs.find(dd => dd.id === docId);
          if (currentDoc) approvedTypes.push(currentDoc.document_type);
        }

        const hasBasicDocs = ["cni_recto", "cni_verso", "selfie_verification"]
          .every(t => approvedTypes.includes(t));

        if (hasBasicDocs) {
          await supabase.from("profiles")
            .update({ is_verified: true })
            .eq("user_id", userId);
        }
      }

      toast({ title: `Document ${status === "approved" ? "approuvé ✅" : "rejeté ❌"}` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const generateLegalReport = async (userId: string) => {
    setGeneratingReport(userId);
    try {
      // Gather all user data for legal report
      const [profileRes, docsRes, ordersRes, disputesRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("kyc_documents").select("*").eq("user_id", userId),
        supabase.from("orders").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).limit(50),
        supabase.from("disputes").select("*").or(`opened_by.eq.${userId},against_user.eq.${userId}`),
        supabase.from("wallets").select("*").eq("user_id", userId).single(),
      ]);

      const profile = profileRes.data;
      const userDocs = docsRes.data || [];
      const orders = ordersRes.data || [];
      const disputes = disputesRes.data || [];
      const wallet = walletRes.data;

      // Generate text report
      const report = [
        `═══════════════════════════════════════`,
        `RAPPORT D'IDENTIFICATION - MIYASHI`,
        `Date: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`,
        `═══════════════════════════════════════`,
        ``,
        `IDENTITÉ UTILISATEUR`,
        `─────────────────────`,
        `ID: ${userId}`,
        `Nom: ${profile?.full_name || "Non renseigné"}`,
        `Téléphone: ${profile?.phone || "Non renseigné"}`,
        `Localisation: ${profile?.location || "Non renseignée"}`,
        `Inscrit le: ${profile?.created_at ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: fr }) : "N/A"}`,
        `Vérifié: ${profile?.is_verified ? "OUI" : "NON"}`,
        ``,
        `DOCUMENTS KYC (${userDocs.length})`,
        `─────────────────────`,
        ...userDocs.map(d => `  • ${DOC_TYPE_LABELS[d.document_type] || d.document_type} | Statut: ${d.status} | Soumis: ${format(new Date(d.submitted_at), "dd/MM/yyyy", { locale: fr })}`),
        ``,
        `HISTORIQUE COMMANDES (${orders.length})`,
        `─────────────────────`,
        ...orders.slice(0, 20).map(o => `  • #${o.id.slice(0, 8)} | ${o.total_price}F | ${o.status} | ${format(new Date(o.created_at), "dd/MM/yyyy", { locale: fr })}`),
        ``,
        `LITIGES (${disputes.length})`,
        `─────────────────────`,
        ...disputes.map(d => `  • #${d.id.slice(0, 8)} | ${d.reason} | ${d.status} | ${d.resolution || "Non résolu"}`),
        ``,
        `PORTEFEUILLE`,
        `─────────────────────`,
        `Solde: ${wallet?.balance || 0}F`,
        `Total gagné: ${wallet?.total_earned || 0}F`,
        `Total retiré: ${wallet?.total_withdrawn || 0}F`,
        ``,
        `═══════════════════════════════════════`,
        `Ce rapport est généré pour usage interne et légal.`,
        `MIYASHI - Plateforme de confiance`,
      ].join("\n");

      // Download as text file
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_legal_${userId.slice(0, 8)}_${format(new Date(), "yyyyMMdd")}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Rapport généré 📄", description: "Fichier téléchargé avec succès" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending documents */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Documents en attente ({pendingDocs.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pendingDocs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucun document en attente ✅</p>
          ) : (
            <div className="space-y-4">
              {pendingDocs.map(doc => (
                <Card key={doc.id} className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.user_id.slice(0, 12)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Soumis le {format(new Date(doc.submitted_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>

                      <Button size="sm" variant="outline" onClick={() => handlePreview(doc.document_url)}>
                        <Eye className="w-4 h-4 mr-1" /> Voir
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={processing === doc.id}
                        onClick={() => updateStatus(doc.id, "approved", doc.user_id)}
                      >
                        {processing === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        Approuver
                      </Button>
                      <div className="flex flex-1 gap-1">
                        <Textarea
                          placeholder="Raison du rejet..."
                          className="text-xs h-9 min-h-0 resize-none"
                          value={rejectionReasons[doc.id] || ""}
                          onChange={e => setRejectionReasons(prev => ({ ...prev, [doc.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing === doc.id}
                          onClick={() => updateStatus(doc.id, "rejected", doc.user_id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Legal report button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs"
                      disabled={generatingReport === doc.user_id}
                      onClick={() => generateLegalReport(doc.user_id)}
                    >
                      {generatingReport === doc.user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      Rapport légal de cet utilisateur
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed documents */}
      {reviewedDocs.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Documents traités ({reviewedDocs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewedDocs.slice(0, 20).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-sm">
                  {doc.status === "approved" ? (
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-medium flex-1">
                    {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                  </span>
                  <span className="text-xs text-muted-foreground">{doc.user_id.slice(0, 8)}</span>
                  <Badge variant={doc.status === "approved" ? "default" : "destructive"} className="text-xs">
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu du document</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center">
              {previewUrl.includes(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[500px] rounded-lg" />
              ) : (
                <img src={previewUrl} alt="Document KYC" className="max-h-[500px] rounded-lg object-contain" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYCPanel;
