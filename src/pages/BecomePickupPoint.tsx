// "Devenir point relais": programme for logistics companies and shops (conditions, documents,
// verifications) with the online application and its follow-up.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";
import PageHero from "@/components/layout/PageHero";
import { PHOTOS } from "@/lib/photos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PickupProgramInfo, { DEFAULT_PROGRAM, type Program } from "@/components/partners/PickupProgramInfo";
import PartnerApplicationForm, { type Application } from "@/components/partners/PartnerApplicationForm";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, FileSearch, XCircle } from "lucide-react";

const STATUS: Record<string, { label: string; text: string; icon: typeof Clock }> = {
  submitted: { label: "Envoyée", text: "Votre dossier est reçu. Il sera examiné sous quelques jours ouvrés.", icon: Clock },
  under_review: { label: "En vérification", text: "Un conseiller vérifie vos pièces. Il pourra vous appeler.", icon: FileSearch },
  info_requested: { label: "Compléments demandés", text: "Complétez votre dossier ci-dessous puis renvoyez-le.", icon: FileSearch },
  visit_scheduled: { label: "Visite programmée", text: "Un agent viendra vérifier votre local. Gardez les originaux de vos pièces.", icon: CalendarClock },
  approved: { label: "Acceptée", text: "Bienvenue dans le réseau ! Gérez vos colis depuis la page Point relais.", icon: CheckCircle2 },
  rejected: { label: "Non retenue", text: "Votre candidature n'a pas été retenue.", icon: XCircle },
};
const ORDER = ["submitted", "under_review", "visit_scheduled", "approved"];

export default function BecomePickupPoint() {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program>(DEFAULT_PROGRAM);
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "pickup_program").maybeSingle().then(({ data }) => data?.value && setProgram({ ...DEFAULT_PROGRAM, ...(data.value as object) }));
  }, []);
  useEffect(() => {
    if (!user) { setApp(null); return; }
    supabase.from("pickup_partner_applications").select("*").eq("user_id", user.id).not("status", "in", "(withdrawn)").order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { setApp(data); if (data && ["draft", "info_requested"].includes(data.status)) setShowForm(true); });
  }, [user]);

  const start = () => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50); };
  const withdraw = async () => {
    if (!app || !confirm("Retirer votre candidature ?")) return;
    await supabase.rpc("withdraw_partner_application", { p_id: app.id });
    toast.success("Candidature retirée"); setApp(null); setShowForm(false);
  };
  const st = app && STATUS[app.status];
  const stepIndex = app ? ORDER.indexOf(app.status === "info_requested" ? "under_review" : app.status) : -1;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Devenir point relais" description="Entreprises de logistique, boutiques, stations : devenez point relais MIYASHI. Conditions, pièces à fournir, vérifications et candidature en ligne." canonical="/devenir-point-relais" />
      <Header />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <PageHero eyebrow="Partenaires logistiques" title="Devenez point relais MIYASHI" photo={PHOTOS.parcels}
            description="Recevez les colis du quartier dans votre commerce, remettez-les aux clients contre leur code, et soyez rémunéré à chaque colis.">
            <div className="flex flex-wrap gap-3">
              {app && st ? <Badge className="text-sm py-1.5 px-3">Votre candidature : {st.label}</Badge>
                : <Button size="lg" onClick={user ? start : undefined} asChild={!user}>{user ? <span>Déposer ma candidature <ArrowRight className="w-4 h-4 ml-1 inline" /></span> : <Link to="/auth?next=/devenir-point-relais">Se connecter pour candidater</Link>}</Button>}
              <a href="#pp-docs" className="inline-flex items-center h-11 px-4 rounded-xl border border-white/30 text-white text-sm">Voir les pièces à fournir</a>
            </div>
          </PageHero>

          {app && st && !["draft"].includes(app.status) && (
            <section className="mt-10 rounded-2xl border border-foreground/10 bg-card/80 p-6" aria-label="Suivi de ma candidature">
              <div className="flex flex-wrap items-center gap-3 mb-4"><st.icon className="w-6 h-6 text-primary" /><h2 className="text-xl font-display font-bold">{app.company_name} — {st.label}</h2></div>
              <p className="text-muted-foreground mb-4">{st.text}{app.status === "visit_scheduled" && app.site_visit_at ? ` Visite le ${new Date(app.site_visit_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Abidjan" })}.` : ""}</p>
              {app.status === "rejected" && app.decision_reason && <p className="text-sm rounded-xl bg-destructive/10 p-3 mb-4">Motif : {app.decision_reason}</p>}
              {app.status !== "rejected" && (
                <ol className="grid grid-cols-4 gap-2 text-xs">{["Envoyée", "Vérification", "Visite", "Activation"].map((l, i) => (
                  <li key={l} className={`rounded-lg p-2 text-center border ${i <= stepIndex ? "border-primary bg-primary/10 text-foreground" : "border-foreground/10 text-muted-foreground"}`}>{l}</li>
                ))}</ol>
              )}
              <div className="flex gap-2 mt-4">
                {app.status === "approved" && <Button asChild><Link to="/pickup-partner">Ouvrir mon espace point relais</Link></Button>}
                {!["approved", "rejected"].includes(app.status) && <Button variant="ghost" onClick={withdraw}>Retirer ma candidature</Button>}
              </div>
            </section>
          )}

          <div className="mt-14"><PickupProgramInfo program={program} /></div>

          <div ref={formRef} className="mt-16 scroll-mt-24">
            {showForm && user && (!app || ["draft", "info_requested"].includes(app.status)) ? (
              <>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Votre candidature</h2>
                <p className="text-muted-foreground mb-6">Chaque étape est enregistrée : vous pouvez reprendre plus tard depuis cette page.</p>
                <PartnerApplicationForm initial={app ?? null} onSubmitted={(a) => { setApp(a); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </>
            ) : !app || app.status === "rejected" ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-8 text-center">
                <h2 className="text-2xl font-display font-bold mb-2">Prêt à rejoindre le réseau ?</h2>
                <p className="text-muted-foreground mb-5">Préparez vos pièces : 15 minutes suffisent pour déposer le dossier.</p>
                {user ? <Button size="lg" onClick={start}>Commencer ma candidature</Button> : <Button size="lg" asChild><Link to="/auth?next=/devenir-point-relais">Créer un compte ou se connecter</Link></Button>}
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
