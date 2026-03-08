import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

interface VerificationGateProps {
  children: React.ReactNode;
  requiredFor?: string; // "sell" | "deliver" | "provide" | "withdraw"
  fallbackMessage?: string;
}

/**
 * Wraps content that requires KYC verification.
 * Shows a verification prompt if the user hasn't completed KYC.
 */
const VerificationGate = ({
  children,
  requiredFor = "sell",
  fallbackMessage,
}: VerificationGateProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) checkVerification();
  }, [user]);

  const checkVerification = async () => {
    if (!user) return;

    // Check if profile is verified
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", user.id)
      .single();

    if (profile?.is_verified) {
      setIsVerified(true);
      return;
    }

    // Check pending docs
    const { data: docs } = await supabase
      .from("kyc_documents")
      .select("status")
      .eq("user_id", user.id);

    const pending = docs?.filter(d => d.status === "pending").length || 0;
    setPendingCount(pending);
    setIsVerified(false);
  };

  if (isVerified === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isVerified) return <>{children}</>;

  const actionLabels: Record<string, string> = {
    sell: "vendre des produits",
    deliver: "effectuer des livraisons",
    provide: "proposer des services",
    withdraw: "retirer des fonds",
  };

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Vérification requise</h3>
          <p className="text-sm text-muted-foreground">
            {fallbackMessage ||
              `Pour ${actionLabels[requiredFor] || "accéder à cette fonctionnalité"}, vous devez vérifier votre identité.`}
          </p>
        </div>

        {pendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800">
            {pendingCount} document(s) en attente de validation
          </Badge>
        )}

        <Button onClick={() => navigate("/profile?tab=verification")} className="gap-2">
          <Shield className="w-4 h-4" />
          Vérifier mon identité
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default VerificationGate;
