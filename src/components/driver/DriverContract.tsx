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
  Loader2, Award, Lock, HandshakeIcon, Eye, Truck, Clock,
  Ban, Scale, UserCheck, AlertCircle, Package, MapPin,
  Phone, MessageSquare, Gavel
} from "lucide-react";
import { toast } from "sonner";
import DriverBadgePrint from "./DriverBadgePrint";

// We group articles into sections for better readability
const CONTRACT_SECTIONS = [
  {
    sectionTitle: "TITRE I — ENGAGEMENTS GÉNÉRAUX",
    sectionDescription: "Obligations fondamentales du livreur MIYASHI",
    articles: [
      {
        id: "art1",
        title: "Article 1 — Serment d'engagement professionnel",
        icon: HandshakeIcon,
        text: "Je soussigné(e), en qualité de livreur indépendant partenaire de la plateforme MIYASHI, m'engage solennellement à exercer mes fonctions avec professionnalisme, rigueur et dans le strict respect des règles établies par la plateforme. Je reconnais avoir pris connaissance de l'ensemble des conditions générales d'utilisation et du présent contrat d'engagement.",
        risk: "Manquement général : avertissement écrit au 1er manquement, suspension temporaire de 7 jours au 2ème, résiliation définitive du partenariat au 3ème avec impossibilité de réinscription pendant 12 mois.",
      },
      {
        id: "art2",
        title: "Article 2 — Respect du code de conduite",
        icon: UserCheck,
        text: "Je m'engage à adopter un comportement courtois, respectueux et professionnel envers les acheteurs, les vendeurs, les autres livreurs et le personnel de MIYASHI. Tout comportement agressif, menaçant, discriminatoire ou irrespectueux est strictement interdit, que ce soit en personne, par téléphone ou via la messagerie de la plateforme.",
        risk: "Comportement inapproprié signalé : suspension immédiate du compte pendant l'enquête. Si confirmé : suspension de 14 à 30 jours. Récidive : exclusion définitive et signalement aux autorités si nécessaire.",
      },
      {
        id: "art3",
        title: "Article 3 — Disponibilité et fiabilité",
        icon: Clock,
        text: "Lorsque je me déclare « en ligne » sur la plateforme, je m'engage à être effectivement disponible pour accepter et effectuer des livraisons dans un délai raisonnable. Je m'engage à ne pas accepter de livraison que je ne suis pas en mesure d'effectuer dans les temps impartis. En cas d'empêchement imprévu, je m'engage à signaler immédiatement mon indisponibilité via l'application.",
        risk: "Taux d'annulation supérieur à 15% sur 30 jours : avertissement. Supérieur à 25% : suspension de 3 jours. Supérieur à 40% : suspension de 14 jours et rétrogradation de badge.",
      },
    ],
  },
  {
    sectionTitle: "TITRE II — CONFIDENTIALITÉ ET PROTECTION DES DONNÉES",
    sectionDescription: "Obligations relatives aux informations personnelles et aux colis",
    articles: [
      {
        id: "art4",
        title: "Article 4 — Confidentialité absolue des colis",
        icon: Lock,
        text: "Je m'engage formellement à ne JAMAIS inscrire, ajouter, coller, glisser ou laisser visible mes coordonnées personnelles (numéro de téléphone, adresse physique, email, identifiant de réseau social, carte de visite) sur les colis, emballages, sacs ou tout support associé aux livraisons que j'effectue. Seules les étiquettes officielles MIYASHI comportant le QR code de suivi doivent figurer sur les envois. Je ne dois pas non plus retirer, altérer ou masquer ces étiquettes officielles.",
        risk: "1ère infraction signalée et confirmée : avertissement formel + perte de 100 points de fidélité. 2ème infraction : suspension de 7 jours + perte du bonus mensuel. 3ème infraction : exclusion définitive du réseau de livreurs avec rétention du solde de commissions pendant 30 jours pour couverture d'éventuels litiges.",
      },
      {
        id: "art5",
        title: "Article 5 — Protection des données personnelles",
        icon: Eye,
        text: "Je m'engage à traiter comme strictement confidentielles toutes les informations personnelles auxquelles j'ai accès dans le cadre de mes livraisons : adresses de retrait et de livraison, noms des acheteurs et vendeurs, numéros de téléphone, contenus des messages liés aux commandes. Ces données ne doivent être utilisées QUE pour l'exécution de la livraison en cours. Il m'est formellement interdit de : (a) noter, copier ou photographier ces informations, (b) les partager avec des tiers, (c) les utiliser à des fins personnelles ou commerciales, (d) les conserver après la livraison.",
        risk: "Divulgation de données personnelles : suspension immédiate pendant enquête. Si confirmée : exclusion définitive + signalement à l'autorité de protection des données (CNIL/équivalent local). Possibilité de poursuites civiles pour dommages et intérêts par la partie lésée.",
      },
      {
        id: "art6",
        title: "Article 6 — Interdiction de contact hors plateforme",
        icon: Phone,
        text: "Je m'engage à ne pas solliciter, encourager ou accepter de contact direct avec les acheteurs ou vendeurs en dehors de la messagerie officielle MIYASHI, sauf nécessité absolue liée à la livraison en cours (ex: difficulté d'accès au lieu de livraison). Dans ce cas, l'appel doit passer par le système de la plateforme. Il m'est interdit de proposer mes services de livraison en dehors de la plateforme aux personnes rencontrées lors de mes missions MIYASHI.",
        risk: "Tentative de contournement avérée : avertissement + déclassement de priorité dans l'attribution des livraisons pendant 30 jours. Récidive : suspension de 14 jours. Transaction hors plateforme confirmée : exclusion définitive + perte de la couverture de protection en litige.",
      },
    ],
  },
  {
    sectionTitle: "TITRE III — INTÉGRITÉ DES LIVRAISONS",
    sectionDescription: "Obligations relatives à la manipulation et au transport des colis",
    articles: [
      {
        id: "art7",
        title: "Article 7 — Intégrité et sécurité des colis",
        icon: Package,
        text: "Je m'engage à : (a) manipuler chaque colis avec le plus grand soin, en tenant compte de sa nature et de sa fragilité, (b) ne JAMAIS ouvrir, déballer, altérer, substituer ou inspecter le contenu d'un colis, (c) transporter les colis dans des conditions appropriées (protection contre la pluie, la chaleur, les chocs), (d) signaler immédiatement via l'application tout dommage constaté AVANT la prise en charge du colis (photo obligatoire), (e) remettre le colis en mains propres au destinataire ou à la personne désignée, jamais à un tiers non autorisé.",
        risk: "Colis endommagé par négligence : retenue sur commission pour couvrir le remboursement (jusqu'à 100% de la valeur du colis). Colis ouvert/altéré : exclusion immédiate + dépôt de plainte pour vol/recel. Colis non livré sans justification : suspension immédiate + remboursement intégral à l'acheteur sur le solde du livreur.",
      },
      {
        id: "art8",
        title: "Article 8 — Respect des délais et itinéraires",
        icon: MapPin,
        text: "Je m'engage à effectuer chaque livraison dans les délais estimés par la plateforme, en empruntant un itinéraire raisonnable et direct. Tout détour injustifié ou retard volontaire constitue un manquement. En cas de retard prévisible (embouteillage, panne, intempérie), je m'engage à prévenir immédiatement via l'application et à proposer une solution alternative au client.",
        risk: "Retards répétés non justifiés (>3 par semaine) : avertissement + impact sur le score de performance. Détour injustifié constaté via le GPS : avertissement formel. Pattern de retards intentionnels : suspension de 7 jours + rétrogradation de badge.",
      },
      {
        id: "art9",
        title: "Article 9 — Vérification par QR code",
        icon: FileCheck,
        text: "Je m'engage à scanner systématiquement le QR code de l'étiquette MIYASHI lors de la prise en charge et de la remise du colis. Ce scan constitue la preuve officielle de la chaîne de responsabilité. Toute livraison effectuée sans scan QR ne pourra pas bénéficier de la couverture de protection en cas de litige. Je m'engage à ne pas simuler de scan ou à utiliser des QR codes frauduleux.",
        risk: "Livraison sans scan : aucune couverture en cas de litige + avertissement. Scan frauduleux : exclusion immédiate + signalement pour fraude.",
      },
    ],
  },
  {
    sectionTitle: "TITRE IV — LOYAUTÉ ET ANTI-CONTOURNEMENT",
    sectionDescription: "Obligations de fidélité envers l'écosystème MIYASHI",
    articles: [
      {
        id: "art10",
        title: "Article 10 — Loyauté envers la plateforme",
        icon: Shield,
        text: "Je m'engage à ne pas contourner la plateforme MIYASHI pour effectuer des transactions directes avec les acheteurs ou vendeurs rencontrés dans le cadre de mes missions. Toutes les livraisons commandées via MIYASHI doivent transiter intégralement par la plateforme (paiement, suivi, confirmation). Il m'est interdit de : (a) proposer des tarifs « hors plateforme » aux clients, (b) distribuer mes coordonnées personnelles pour des livraisons futures, (c) recommander aux clients de commander directement auprès des vendeurs, (d) dénigrer la plateforme auprès des utilisateurs.",
        risk: "Transaction hors plateforme confirmée : exclusion définitive + perte de tous les points de fidélité + rétention du solde commissions pendant 60 jours. Dénigrement avéré : avertissement puis suspension.",
      },
      {
        id: "art11",
        title: "Article 11 — Interdiction de collusion",
        icon: Ban,
        text: "Je m'engage à ne pas m'associer, coordonner ou collaborer avec d'autres livreurs, vendeurs ou acheteurs dans le but de manipuler le système de la plateforme, notamment : (a) création de fausses commandes pour gonfler les statistiques, (b) évaluations croisées frauduleuses, (c) partage de comptes livreur, (d) organisation de grèves ou blocages visant à nuire à la plateforme, (e) manipulation des prix ou des zones de livraison.",
        risk: "Fraude organisée : exclusion immédiate de tous les comptes impliqués + signalement aux autorités judiciaires + poursuites civiles pour dommages à la plateforme.",
      },
    ],
  },
  {
    sectionTitle: "TITRE V — COUVERTURE ET PROTECTION DU LIVREUR",
    sectionDescription: "Droits et protections dont bénéficie le livreur en contrepartie de ses engagements",
    articles: [
      {
        id: "art12",
        title: "Article 12 — Protection en cas de litige",
        icon: Scale,
        text: "En contrepartie du respect de l'ensemble des engagements du présent contrat, MIYASHI s'engage à : (a) assurer une couverture prioritaire du livreur lors de tout litige avec un acheteur ou un vendeur, (b) ne pas retenir de commission sur les livraisons contestées si le livreur a respecté la procédure (scan QR, photos, délais), (c) fournir un médiateur dédié dans les 24h suivant l'ouverture d'un litige, (d) ne pas suspendre le compte du livreur pendant l'enquête sauf cas de fraude manifeste, (e) indemniser le livreur si le litige est résolu en sa faveur (frais de déplacement + compensation morale).",
        risk: null,
      },
      {
        id: "art13",
        title: "Article 13 — Programme de fidélité et avantages",
        icon: Award,
        text: "Le livreur respectant ses engagements bénéficie de : (a) accumulation de points de fidélité ouvrant droit à des bonus (Bronze → Argent → Or), (b) priorité dans l'attribution des livraisons à forte valeur, (c) accès à des formations et outils premium, (d) visibilité renforcée auprès des vendeurs demandant un livreur spécifique, (e) bonus de performance mensuels pour les livreurs ayant un taux de satisfaction supérieur à 95%.",
        risk: null,
      },
      {
        id: "art14",
        title: "Article 14 — Procédure de contestation",
        icon: Gavel,
        text: "Le livreur dispose d'un droit de contestation à chaque étape disciplinaire. Toute sanction peut être contestée dans un délai de 7 jours via le système de litiges de la plateforme. La contestation suspend l'exécution de la sanction jusqu'à la décision finale du médiateur. Le livreur peut fournir des preuves (photos, captures d'écran, témoignages) pour appuyer sa contestation. La décision du médiateur est définitive et sans appel.",
        risk: null,
      },
      {
        id: "art15",
        title: "Article 15 — Résiliation volontaire",
        icon: AlertCircle,
        text: "Le livreur peut mettre fin à son partenariat avec MIYASHI à tout moment en le notifiant via l'application. Les livraisons en cours doivent être terminées ou réattribuées avant la résiliation effective. Le solde de commissions sera versé dans un délai de 15 jours ouvrés après la dernière livraison. Les points de fidélité non convertis seront perdus. Le livreur pourra se réinscrire après un délai de 30 jours.",
        risk: null,
      },
    ],
  },
];

// Flatten all article IDs for checkbox state
const ALL_ARTICLE_IDS = CONTRACT_SECTIONS.flatMap((s) =>
  s.articles.map((a) => a.id)
);

const DriverContract = () => {
  const { user } = useAuth();
  const [checkedArticles, setCheckedArticles] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_ARTICLE_IDS.map((id) => [id, false]))
  );
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

  const checkedCount = Object.values(checkedArticles).filter(Boolean).length;
  const allChecked = checkedCount === ALL_ARTICLE_IDS.length;

  const handleSign = async () => {
    if (!user || !allChecked) return;
    setSigning(true);
    try {
      const { data, error } = await (supabase.from("driver_contracts" as any) as any).insert({
        user_id: user.id,
        oath_accepted: true,
        no_contact_on_packages: true,
        loyalty_commitment: true,
        honesty_commitment: true,
        confidentiality_commitment: true,
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

  // If badge already generated
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

  // If contract signed but no badge
  if (existingContract) {
    return (
      <Card className="border-0 shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-display">
            <CheckCircle className="w-6 h-6 text-accent" />
            Contrat signé — 15 articles acceptés
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
                className="w-full h-11 bg-gradient-hero text-base"
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
            <CardDescription>15 articles • Engagement de confiance, loyauté et professionnalisme</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <span className="text-sm font-medium">Progression de lecture</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${(checkedCount / ALL_ARTICLE_IDS.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-accent">{checkedCount}/{ALL_ARTICLE_IDS.length}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            📋 Ce contrat comprend <strong>15 articles</strong> répartis en <strong>5 titres</strong>.
            Lisez attentivement chaque article et cochez-le pour confirmer votre compréhension.
            Les livreurs signataires bénéficient d'une <strong>couverture prioritaire</strong> et d'une
            <strong> protection renforcée</strong> en cas de litige.
          </p>
        </div>

        <ScrollArea className="h-[min(420px,55vh)] pr-4">
          <div className="space-y-4">
            {CONTRACT_SECTIONS.map((section, sIdx) => (
              <div key={sIdx}>
                {/* Section header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 mb-3">
                  <h3 className="font-display font-bold text-base text-primary">{section.sectionTitle}</h3>
                  <p className="text-xs text-muted-foreground">{section.sectionDescription}</p>
                </div>

                <div className="space-y-3">
                  {section.articles.map((article) => {
                    const Icon = article.icon;
                    const checked = checkedArticles[article.id];
                    return (
                      <div
                        key={article.id}
                        className={`p-4 rounded-xl border transition-all duration-200 ${
                          checked
                            ? "bg-accent/5 border-accent/30"
                            : "bg-muted/10 border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${checked ? "text-accent" : "text-muted-foreground"}`} />
                          <div className="flex-1">
                            <h4 className="font-display font-semibold text-sm">{article.title}</h4>
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                              {article.text}
                            </p>

                            {/* Sanctions section */}
                            {article.risk && (
                              <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/15">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-destructive mb-1">Sanctions en cas de non-respect :</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{article.risk}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <label className="flex items-center gap-3 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setCheckedArticles({ ...checkedArticles, [article.id]: !!v })
                            }
                          />
                          <span className="text-xs font-medium">
                            J'ai lu, compris et j'accepte les termes de cet article
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Final declaration */}
            <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20">
              <h4 className="font-display font-bold text-sm mb-2">📜 Déclaration finale</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                En signant ce contrat, je déclare sur l'honneur que les informations fournies lors de mon inscription
                sont exactes et vérifiables. Je reconnais avoir lu et compris l'intégralité des 15 articles du présent
                contrat. Je m'engage à respecter l'ensemble de ces dispositions pendant toute la durée de mon
                partenariat avec MIYASHI. Je comprends que le non-respect de ces engagements peut entraîner des
                sanctions allant de l'avertissement à l'exclusion définitive, ainsi que des poursuites judiciaires
                dans les cas les plus graves. En contrepartie, je bénéficie de la protection et de la couverture
                décrites aux articles 12 à 15 du présent contrat.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-2 space-y-3">
          <Button
            onClick={handleSign}
            disabled={!allChecked || signing}
            className="w-full h-11 text-base bg-gradient-hero"
          >
            {signing ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signature en cours...</>
            ) : (
              <><FileCheck className="mr-2 h-5 w-5" /> Signer le contrat ({checkedCount}/{ALL_ARTICLE_IDS.length})</>
            )}
          </Button>
          {!allChecked && (
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Vous devez lire et accepter les {ALL_ARTICLE_IDS.length} articles pour signer le contrat
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverContract;
