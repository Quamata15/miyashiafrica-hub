import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield, FileCheck, Printer, CheckCircle, AlertTriangle,
  Loader2, Award, Lock, HandshakeIcon
} from "lucide-react";
import { toast } from "sonner";
import DriverBadgePrint from "./DriverBadgePrint";

interface ContractState {
  oath_accepted: boolean;
  no_contact_on_packages: boolean;
  loyalty_commitment: boolean;
  honesty_commitment: boolean;
  confidentiality_commitment: boolean;
}

const CONTRACT_ARTICLES = [
  {
    key: "oath_accepted" as const,
    title: "Serment d'engagement",
    icon: HandshakeIcon,
    text: "Je m'engage à exercer mes fonctions de livreur MIYASHI avec professionnalisme, intégrité et dans le respect des règles de la plateforme. Je comprends que tout manquement pourra entraîner des sanctions.",
  },
  {
    key: "no_contact_on_packages" as const,
    title: "Confidentialité des colis",
    icon: Lock,
    text: "Je m'engage à ne jamais inscrire, ajouter ou laisser visible mes coordonnées personnelles (numéro de téléphone, adresse, réseaux sociaux) sur les colis que je récupère et livre. Seules les étiquettes officielles MIYASHI avec QR code doivent figurer sur les envois.",
  },
  {
    key: "loyalty_commitment" as const,
    title: "Loyauté envers la plateforme",
    icon: Shield,
    text: "Je m'engage à ne pas contourner la plateforme pour effectuer des transactions directes avec les acheteurs ou vendeurs. Toutes les livraisons doivent transiter par MIYASHI pour garantir la protection de toutes les parties.",
  },
  {
    key: "honesty_commitment" as const,
    title: "Honnêteté et intégrité",
    icon: Award,
    text: "Je m'engage à livrer les colis en bon état, à signaler tout dommage constaté avant la livraison, et à ne jamais ouvrir, altérer ou substituer le contenu d'un colis. En cas de litige, je m'engage à coopérer pleinement avec la plateforme.",
  },
  {
    key: "confidentiality_commitment" as const,
    title: "Protection des données",
    icon: FileCheck,
    text: "Je m'engage à ne pas divulguer les informations personnelles des acheteurs et vendeurs (adresses, numéros de téléphone) auxquelles j'ai accès dans le cadre de mes livraisons. Ces données sont strictement réservées à l'exécution de la livraison.",
  },
];

const DriverContract = () => {
  const { user } = useAuth();
  const [commitments, setCommitments] = useState<ContractState>({
    oath_accepted: false,
    no_contact_on_packages: false,
    loyalty_commitment: false,
    honesty_commitment: false,
    confidentiality_commitment: false,
  });
  const [existingContract, setExistingContract] = useState<any>(null);
  const [kycApproved, setKycApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [generatingBadge, setGeneratingBadge] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [contractRes, kycRes, driverRes, profileRes] = await Promise.all([
      supabase.from("driver_contracts" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("kyc_documents").select("status").eq("user_id", user.id).eq("status", "approved").limit(1),
      supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (contractRes.data) setExistingContract(contractRes.data);
    if (kycRes.data && kycRes.data.length > 0) setKycApproved(true);
    if (driverRes.data) setDriverProfile(driverRes.data);
    if (profileRes.data) setUserProfile(profileRes.data);
    setLoading(false);
  };

  const allChecked = Object.values(commitments).every(Boolean);

  const handleSign = async () => {
    if (!user || !allChecked) return;
    setSigning(true);
    try {
      const { data, error } = await (supabase.from("driver_contracts" as any) as any).insert({
        user_id: user.id,
        ...commitments,
      }).select().single();
      if (error) throw error;
      setExistingContract(data);
      toast.success("Contrat signé avec succès ! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  const handleGenerateBadge = async () => {
    if (!existingContract) return;
    setGeneratingBadge(true);
    try {
      const { data, error } = await supabase.rpc("generate_driver_badge" as any, {
        p_contract_id: existingContract.id,
      });
      if (error) throw error;
      setExistingContract({ ...existingContract, badge_number: data, kyc_verified: true, badge_generated_at: new Date().toISOString() });
      toast.success(`Badge généré : ${data}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération du badge");
    } finally {
      setGeneratingBadge(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If badge already generated, show printable badge
  if (existingContract?.badge_number) {
    return (
      <DriverBadgePrint
        badgeNumber={existingContract.badge_number}
        driverName={userProfile?.full_name || "Livreur MIYASHI"}
        zone={driverProfile?.zone || "Lomé"}
        vehicleType={driverProfile?.vehicle_type || "moto"}
        signedAt={existingContract.signed_at}
        badgeGeneratedAt={existingContract.badge_generated_at}
      />
    );
  }

  // If contract signed but no badge yet
  if (existingContract) {
    return (
      <Card className="border-0 shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-display">
            <CheckCircle className="w-6 h-6 text-accent" />
            Contrat signé
          </CardTitle>
          <CardDescription>
            Signé le {new Date(existingContract.signed_at).toLocaleDateString("fr-FR")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!kycApproved ? (
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-secondary mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Vérification d'identité requise</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous devez compléter la vérification KYC avant de pouvoir générer votre badge officiel.
                    Rendez-vous dans votre profil → Vérification d'identité.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Identité vérifiée ✓</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous pouvez maintenant générer votre badge officiel MIYASHI.
                      Ce badge vous identifie comme livreur certifié et vous protège en cas de litige.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleGenerateBadge}
                disabled={generatingBadge}
                className="w-full h-12 bg-gradient-hero text-lg"
              >
                {generatingBadge ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Génération...</>
                ) : (
                  <><Printer className="mr-2 h-5 w-5" /> Générer mon badge officiel</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Contract signing form
  return (
    <Card className="border-0 shadow-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center">
            <HandshakeIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl font-display">Contrat de livreur MIYASHI</CardTitle>
            <CardDescription>Engagement de confiance et de professionnalisme</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            En signant ce contrat, vous vous engagez à respecter les règles de la plateforme.
            Les livreurs qui respectent ces engagements bénéficient d'une <strong>couverture prioritaire</strong> en cas de litige
            et d'une <strong>protection renforcée</strong> par la plateforme.
          </p>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {CONTRACT_ARTICLES.map((article) => {
              const Icon = article.icon;
              const checked = commitments[article.key];
              return (
                <div
                  key={article.key}
                  className={`p-4 rounded-xl border transition-colors ${
                    checked
                      ? "bg-accent/5 border-accent/30"
                      : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${checked ? "text-accent" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <h4 className="font-display font-semibold text-sm">{article.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {article.text}
                      </p>
                    </div>
                  </div>
                  <Separator className="mb-3" />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setCommitments({ ...commitments, [article.key]: !!v })
                      }
                    />
                    <span className="text-sm font-medium">
                      Je lis, comprends et accepte cet engagement
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="pt-2">
          <Button
            onClick={handleSign}
            disabled={!allChecked || signing}
            className="w-full h-12 text-lg bg-gradient-hero"
          >
            {signing ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signature en cours...</>
            ) : (
              <><FileCheck className="mr-2 h-5 w-5" /> Signer le contrat</>
            )}
          </Button>
          {!allChecked && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Vous devez accepter tous les engagements pour signer
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverContract;
