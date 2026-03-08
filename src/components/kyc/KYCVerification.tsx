import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Upload, CheckCircle, XCircle, Clock, FileText,
  Camera, AlertTriangle, Loader2, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KYCDoc {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
}

const DOCUMENT_TYPES = [
  { value: "cni_recto", label: "CNI - Recto", desc: "Face avant de votre carte d'identité", icon: FileText },
  { value: "cni_verso", label: "CNI - Verso", desc: "Face arrière de votre carte d'identité", icon: FileText },
  { value: "passeport", label: "Passeport", desc: "Page principale de votre passeport", icon: FileText },
  { value: "selfie_verification", label: "Selfie de vérification", desc: "Photo de vous tenant votre pièce d'identité", icon: Camera },
  { value: "nif", label: "NIF / Registre de commerce", desc: "Numéro d'identification fiscale ou registre", icon: FileText },
  { value: "permis_conduire", label: "Permis de conduire", desc: "Pour les livreurs uniquement", icon: FileText },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approuvé", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-800", icon: XCircle },
};

const KYCVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<KYCDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchDocs();
      fetchRoles();
    }
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (data) setUserRoles(data.map(r => r.role));
  };

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  };

  const getRequiredDocs = () => {
    const required = ["cni_recto", "cni_verso", "selfie_verification"];
    if (userRoles.some(r => ["seller", "provider", "employer"].includes(r))) {
      required.push("nif");
    }
    if (userRoles.includes("driver")) {
      required.push("permis_conduire");
    }
    return required;
  };

  const requiredDocs = getRequiredDocs();
  const approvedDocs = docs.filter(d => d.status === "approved").map(d => d.document_type);
  const completedRequired = requiredDocs.filter(r => approvedDocs.includes(r));
  const progress = requiredDocs.length > 0 ? (completedRequired.length / requiredDocs.length) * 100 : 0;
  const isFullyVerified = progress === 100;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedType) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo", variant: "destructive" });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format non supporté", description: "JPG, PNG, WebP ou PDF uniquement", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${selectedType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("kyc_documents").insert({
        user_id: user.id,
        document_type: selectedType,
        document_url: path,
        status: "pending",
      });

      if (insertError) throw insertError;

      toast({ title: "Document soumis ✅", description: "Votre document sera examiné sous 24-48h." });
      setSelectedType("");
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Erreur d'envoi", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className={`h-1.5 ${isFullyVerified ? "bg-accent" : "bg-primary"}`}>
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isFullyVerified ? "bg-accent/10" : "bg-primary/10"}`}>
                <Shield className={`w-6 h-6 ${isFullyVerified ? "text-accent" : "text-primary"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Vérification d'identité</CardTitle>
                <CardDescription>
                  {isFullyVerified
                    ? "Votre profil est entièrement vérifié ✅"
                    : `${completedRequired.length}/${requiredDocs.length} documents validés`}
                </CardDescription>
              </div>
            </div>
            <Badge className={isFullyVerified ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}>
              {isFullyVerified ? "Vérifié" : "En cours"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2 mb-4" />

          {/* Required documents checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requiredDocs.map(docType => {
              const config = DOCUMENT_TYPES.find(d => d.value === docType);
              const submitted = docs.find(d => d.document_type === docType);
              const status = submitted?.status || "missing";
              const StatusIcon = status === "approved" ? CheckCircle : status === "rejected" ? XCircle : status === "pending" ? Clock : AlertTriangle;
              const statusColor = status === "approved" ? "text-green-600" : status === "rejected" ? "text-red-500" : status === "pending" ? "text-yellow-600" : "text-muted-foreground";

              return (
                <div key={docType} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
                  <span className="text-sm font-medium flex-1">{config?.label || docType}</span>
                  {status === "rejected" && submitted?.rejection_reason && (
                    <span className="text-xs text-destructive truncate max-w-[120px]" title={submitted.rejection_reason}>
                      {submitted.rejection_reason}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload new document */}
      {!isFullyVerified && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Soumettre un document</CardTitle>
            <CardDescription>Formats acceptés : JPG, PNG, WebP, PDF (max 5 Mo)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le type de document" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.filter(d => {
                  // Show only relevant doc types
                  if (d.value === "permis_conduire" && !userRoles.includes("driver")) return false;
                  if (d.value === "nif" && !userRoles.some(r => ["seller", "provider", "employer"].includes(r))) return false;
                  return true;
                }).map(d => (
                  <SelectItem key={d.value} value={d.value}>
                    <div className="flex items-center gap-2">
                      <d.icon className="w-4 h-4" />
                      <span>{d.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedType && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <p className="text-sm text-muted-foreground mb-3">
                  {DOCUMENT_TYPES.find(d => d.value === selectedType)?.desc}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleUpload}
                  className="hidden"
                  id="kyc-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Sélectionner et envoyer</>
                  )}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document history */}
      {docs.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Documents soumis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {docs.map(doc => {
                  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <StatusIcon className="w-5 h-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {DOCUMENT_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.submitted_at).toLocaleDateString("fr-FR")}
                        </p>
                        {doc.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{doc.rejection_reason}</p>
                        )}
                      </div>
                      <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal notice */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Pourquoi cette vérification ?</p>
              <p>
                Vos documents sont stockés de manière sécurisée et utilisés uniquement pour vérifier votre identité.
                En cas de litige ou d'activité frauduleuse, ces informations peuvent être transmises aux autorités
                compétentes conformément à la législation en vigueur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCVerification;
