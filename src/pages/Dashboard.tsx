// Dashboard organised by space: buyer, seller, driver, provider, freelance, recruiter.
// One account can hold several spaces; each has its own tabs and guide.
// URL: /dashboard?espace=recruteur&onglet=pipeline&offre=<id>
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, MessageSquare, Wallet, Settings, UserRound, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import EmailVerificationBanner from "@/components/dashboard/EmailVerificationBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import SpaceSwitcher, { AddSpaceDialog } from "@/components/spaces/SpaceSwitcher";
import { availableSpaces, defaultSpace, spaceOf } from "@/components/spaces/registry";
import type { SpaceKey } from "@/components/spaces/guides";

const SpaceGuide = lazy(() => import("@/components/spaces/SpaceGuide"));
const BuyerHome = lazy(() => import("@/components/spaces/buyer/BuyerHome"));
const ReceivedInvoices = lazy(() => import("@/components/spaces/buyer/ReceivedInvoices"));
const DriverEarnings = lazy(() => import("@/components/spaces/driver/DriverEarnings"));
const ProviderHome = lazy(() => import("@/components/spaces/provider/ProviderHome"));
const PackagesManager = lazy(() => import("@/components/spaces/provider/PackagesManager"));
const ProviderInvoices = lazy(() => import("@/components/spaces/provider/ProviderInvoices"));
const ProviderClients = lazy(() => import("@/components/spaces/provider/ProviderClients"));
const ProviderProfileForm = lazy(() => import("@/components/spaces/provider/ProviderProfileForm"));
const FreelanceHome = lazy(() => import("@/components/spaces/freelance/FreelanceHome"));
const RecommendedJobs = lazy(() => import("@/components/spaces/freelance/RecommendedJobs"));
const MyApplications = lazy(() => import("@/components/spaces/freelance/MyApplications"));
const MyInterviews = lazy(() => import("@/components/spaces/freelance/MyInterviews"));
const CandidateProfileForm = lazy(() => import("@/components/spaces/freelance/CandidateProfileForm"));
const RecruiterHome = lazy(() => import("@/components/spaces/recruiter/RecruiterHome"));
const JobsManager = lazy(() => import("@/components/spaces/recruiter/JobsManager"));
const Pipeline = lazy(() => import("@/components/spaces/recruiter/Pipeline"));
const InterviewsBoard = lazy(() => import("@/components/spaces/recruiter/InterviewsBoard"));
const TalentPool = lazy(() => import("@/components/spaces/recruiter/TalentPool"));
const Templates = lazy(() => import("@/components/spaces/recruiter/Templates"));
const CompanyProfileForm = lazy(() => import("@/components/spaces/recruiter/CompanyProfileForm"));
const GuideProgressCard = lazy(() => import("@/components/spaces/SpaceGuide").then((m) => ({ default: m.GuideProgressCard })));
const OrdersTable = lazy(() => import("@/components/dashboard/OrdersTable"));
const ProductsList = lazy(() => import("@/components/dashboard/ProductsList"));
const ServicesList = lazy(() => import("@/components/dashboard/ServicesList"));
const SellerOverview = lazy(() => import("@/components/dashboard/SellerOverview"));
const LowStockAlert = lazy(() => import("@/components/dashboard/LowStockAlert"));
const DriverOverview = lazy(() => import("@/components/dashboard/DriverOverview"));
const DeliveryTracking = lazy(() => import("@/components/dashboard/DeliveryTracking"));
const DriverDeliveryHistory = lazy(() => import("@/components/dashboard/DriverDeliveryHistory"));
const ServiceMilestones = lazy(() => import("@/components/dashboard/ServiceMilestones"));
const NotificationsList = lazy(() => import("@/components/dashboard/NotificationsList"));
const PromotionsManager = lazy(() => import("@/components/dashboard/PromotionsManager"));
const BoostAnalytics = lazy(() => import("@/components/dashboard/BoostAnalytics"));
const ExportCenter = lazy(() => import("@/components/dashboard/ExportCenter"));
const DeliveryMap = lazy(() => import("@/components/map/DeliveryMap"));

const Fallback = () => <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
const Boxed = ({ title, children }: { title: string; children: React.ReactNode }) => <Card className="border-foreground/[0.07] bg-card/80"><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
const STORE_KEY = "miyashi_space";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [params, setParams] = useSearchParams();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const loadRoles = async () => {
    if (!user) return;
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    ]);
    setRoles((r ?? []).map((x) => x.role));
    setName(p?.full_name?.split(" ")[0] ?? "");
  };
  useEffect(() => { loadRoles(); }, [user?.id]);

  const spaces = useMemo(() => availableSpaces(roles ?? []), [roles]);
  const stored = (() => { try { return localStorage.getItem(STORE_KEY); } catch { return null; } })();
  const wanted = params.get("espace") ?? stored;
  const space: SpaceKey = (spaces.find((s) => s.key === wanted)?.key ?? defaultSpace(roles ?? [])) as SpaceKey;
  const def = spaceOf(space)!;
  const tab = params.get("onglet") ?? "vue";

  const go = (next: { espace?: string; onglet?: string; extra?: Record<string, string> }) => {
    const p = new URLSearchParams();
    p.set("espace", next.espace ?? space);
    p.set("onglet", next.onglet ?? "vue");
    Object.entries(next.extra ?? {}).forEach(([k, v]) => p.set(k, v));
    if (next.onglet === undefined && next.extra === undefined && params.get("offre") && (next.espace ?? space) === space) p.set("offre", params.get("offre")!);
    setParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onTab = (t: string, extra?: Record<string, string>) => go({ onglet: t, extra });
  const switchSpace = (k: SpaceKey) => { try { localStorage.setItem(STORE_KEY, k); } catch { /* storage unavailable */ } go({ espace: k, onglet: "vue" }); };

  const content = () => {
    if (tab === "notifications") return <NotificationsList />;
    if (tab === "guide") return <SpaceGuide space={space} onTab={onTab} />;
    switch (`${space}:${tab}`) {
      case "acheteur:vue": return <BuyerHome onTab={onTab} />;
      case "acheteur:commandes": return <Boxed title="Mes commandes"><OrdersTable /></Boxed>;
      case "acheteur:suivi": return <DeliveryTracking />;
      case "acheteur:factures": return <ReceivedInvoices />;

      case "vendeur:vue": return <div className="space-y-6"><GuideProgressCard space="vendeur" onTab={onTab} /><LowStockAlert /><SellerOverview /></div>;
      case "vendeur:commandes": return <Boxed title="Commandes reçues"><OrdersTable sellerId={user?.id} /></Boxed>;
      case "vendeur:produits": return <ProductsList />;
      case "vendeur:promotions": case "prestataire:promotions": return <PromotionsManager />;
      case "vendeur:boosts": return <BoostAnalytics />;
      case "vendeur:documents": return <ExportCenter />;

      case "livreur:vue": return <div className="space-y-6"><DriverEarnings onTab={onTab} /><DriverOverview /></div>;
      case "livreur:livraisons": return <DeliveryTracking />;
      case "livreur:historique": return <DriverDeliveryHistory />;
      case "livreur:carte": return <Card className="overflow-hidden"><CardContent className="p-0"><DeliveryMap orderId="live" deliveryRequestId={null} origin={{ lat: 6.1319, lng: 1.2228 }} destination={{ lat: 6.1725, lng: 1.2314 }} deliveryStatus="in_transit" estimatedTime="25 min" trackingNumber="MYS-LIVE" enableRealtime={true} /></CardContent></Card>;

      case "prestataire:vue": return <ProviderHome onTab={onTab} />;
      case "prestataire:services": return <ServicesList />;
      case "prestataire:formules": return <PackagesManager />;
      case "prestataire:factures": return <ProviderInvoices />;
      case "prestataire:clients": return <ProviderClients />;
      case "prestataire:etapes": return <ServiceMilestones />;
      case "prestataire:profil": return <ProviderProfileForm />;

      case "freelance:vue": return <FreelanceHome onTab={onTab} />;
      case "freelance:offres": return <RecommendedJobs />;
      case "freelance:candidatures": return <MyApplications onTab={onTab} />;
      case "freelance:entretiens": return <MyInterviews />;
      case "freelance:profil": return <CandidateProfileForm />;

      case "recruteur:vue": return <RecruiterHome onTab={onTab} />;
      case "recruteur:offres": return <JobsManager onTab={onTab} autoNew={params.get("nouvelle") === "1"} />;
      case "recruteur:pipeline": return <Pipeline />;
      case "recruteur:entretiens": return <InterviewsBoard />;
      case "recruteur:vivier": return <TalentPool />;
      case "recruteur:modeles": return <Templates />;
      case "recruteur:entreprise": return <CompanyProfileForm />;
    }
    return <SpaceGuide space={space} onTab={onTab} />;
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const common = [
    { label: "Notifications", icon: Bell, action: () => onTab("notifications"), badge: unreadCount, active: tab === "notifications" },
    { label: "Messages", icon: MessageSquare, action: () => navigate("/messages") },
    { label: "Portefeuille", icon: Wallet, action: () => navigate("/wallet") },
    { label: "Mon profil", icon: UserRound, action: () => navigate("/profile") },
    { label: "Paramètres", icon: Settings, action: () => navigate("/settings") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title={`Espace ${def.label}`} description="Gérez votre activité sur MIYASHI" canonical="/dashboard" noindex />
      <Header />
      <main className="flex-1 pt-[72px]">
        <div className="container max-w-7xl px-4 py-5 md:py-8">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Espace {def.label}</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{greeting}{name ? `, ${name}` : ""}</h1>
              <p className="text-sm text-muted-foreground">{def.tagline}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/messages")}><MessageSquare className="w-4 h-4 mr-1" />Messages</Button>
              <Button size="sm" onClick={() => navigate("/create")}><Plus className="w-4 h-4 mr-1" />Publier</Button>
            </div>
          </motion.div>

          {roles === null ? <Skeleton className="h-9 w-full max-w-xl rounded-full" /> : <SpaceSwitcher spaces={spaces} active={space} onChange={switchSpace} onAdd={() => setAdding(true)} />}
          {user && !user.email_confirmed_at && user.email && <div className="mt-4"><EmailVerificationBanner email={user.email} /></div>}

          <div className="mt-5 grid gap-6 lg:grid-cols-[230px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={`Navigation de l'espace ${def.label}`}>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
                {def.tabs.map((t) => (
                  <button key={t.key} onClick={() => onTab(t.key)} aria-current={tab === t.key ? "page" : undefined}
                    className={cn("shrink-0 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors", tab === t.key ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <t.icon className="w-4 h-4" /><span>{t.label}</span>
                  </button>
                ))}
                <span className="hidden lg:block my-2 border-t border-border" />
                {common.map((c) => (
                  <button key={c.label} onClick={c.action} className={cn("shrink-0 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors", c.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground", c.label !== "Notifications" && "hidden lg:flex")}>
                    <c.icon className="w-4 h-4" /><span>{c.label}</span>{!!c.badge && <Badge className="ml-auto h-5">{c.badge}</Badge>}
                  </button>
                ))}
              </nav>
            </aside>
            <section className="min-w-0">
              <motion.div key={`${space}-${tab}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Suspense fallback={<Fallback />}>{content()}</Suspense>
              </motion.div>
            </section>
          </div>
        </div>
      </main>
      <AddSpaceDialog open={adding} onOpenChange={setAdding} roles={roles ?? []} onActivated={async (k) => { await loadRoles(); try { localStorage.setItem(STORE_KEY, k); } catch { /* storage unavailable */ } go({ espace: k, onglet: k === "acheteur" ? "vue" : "guide" }); }} />
    </div>
  );
}

