import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SimpleMarkdown from "@/components/admin/SimpleMarkdown";
import { COUNTRY_OPTIONS } from "@/components/commerce/ProductExtras";

type Doc = { id: string; country: string; doc_type: string; version: string; title: string; content: string; published_at: string };
const DOC_LABEL: Record<string, string> = { terms: "Conditions d'utilisation", sales: "Conditions de vente", privacy: "Confidentialité", cookies: "Cookies" };

const Terms = () => {
  const sections = [
    { title: "1. Objet", content: "Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation de la plateforme MIYASHI, un service de marketplace, livraison et freelance opéré par ASHIZAN Group." },
    { title: "2. Inscription", content: "L'inscription sur la plateforme est gratuite. L'utilisateur s'engage à fournir des informations exactes et à jour. Tout utilisateur peut être acheteur, vendeur, prestataire de services, freelance, employeur ou livreur. La vérification KYC (au moins 2 pièces d'identité) est requise pour les transactions financières." },
    { title: "3. Paiements & Escrow", content: "Les paiements en ligne (mobile money ou carte via FedaPay, ou portefeuille MIYASHI) sont bloqués en séquestre puis libérés au vendeur après confirmation de la réception par l'acheteur, ou automatiquement 7 jours après la remise en l'absence de litige. Le paiement à la livraison (jusqu'à 150 000 FCFA, si le vendeur l'accepte) se fait contre le code de remise à 6 chiffres de l'acheteur. La commission de la plateforme (10 %) est déduite automatiquement." },
    { title: "4. Livraisons", content: "Les tarifs de livraison sont calculés par kilomètre selon le véhicule : Moto (550F/km), Tricycle (1000F/km), Voiture (1500F/km), Camionnette (2000F/km). Une commission fixe de 18% est prélevée sur les frais de livraison. Les livreurs sont évalués après chaque livraison sur la politesse, le temps de livraison et l'état du produit." },
    { title: "5. Abonnements Prestataires", content: "Les prestataires de services sont tenus de souscrire un abonnement annuel : Petite entreprise (10 000 FCFA), Moyenne (20 000 FCFA), Grande (35 000 FCFA). Le montant varie selon la taille de l'entreprise et la zone géographique." },
    { title: "6. Boostage & Promotions", content: "Les utilisateurs peuvent booster leurs produits, services ou profils pour une meilleure visibilité. Les prix de boostage sont compris entre 2 500 FCFA et 25 000 FCFA selon la durée et le rayon géographique choisi." },
    { title: "7. Responsabilités", content: "MIYASHI agit en tant qu'intermédiaire. La plateforme n'est pas responsable de la qualité des produits ou services vendus par les utilisateurs. Tout litige doit être signalé via le système de support." },
    { title: "8. Protection des données", content: "Les données personnelles sont traitées conformément à notre politique de confidentialité. Les documents KYC sont stockés de manière sécurisée et ne sont accessibles qu'aux administrateurs autorisés." },
    { title: "9. Modification", content: "MIYASHI se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront notifiés de toute modification substantielle." },
    { title: "10. Données & cookies", content: "Le stockage du navigateur sert à la session, au panier et aux préférences. La mesure des produits consultés (statistiques vendeurs, recommandations) n'a lieu qu'avec votre accord. Vous pouvez télécharger toutes vos données depuis Préférences et confidentialité, et supprimer votre compte depuis votre profil." },
    { title: "11. Droit applicable", content: "Les présentes conditions sont régies par le droit togolais. Tout litige sera soumis aux tribunaux compétents de Lomé, Togo." },
  ];

  const [docs, setDocs] = useState<Doc[]>([]);
  const [country, setCountry] = useState(() => { try { return localStorage.getItem("miyashi_country") || "TG"; } catch { return "TG"; } });
  useEffect(() => {
    supabase.from("legal_documents").select("*").eq("is_active", true).in("country", ["ALL", country]).order("published_at", { ascending: false })
      .then(({ data }) => {
        const best: Record<string, Doc> = {};
        for (const d of (data ?? []) as Doc[]) if (!best[d.doc_type] || (best[d.doc_type].country === "ALL" && d.country !== "ALL")) best[d.doc_type] = d;
        setDocs(Object.values(best));
      });
  }, [country]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Conditions d'Utilisation" description="Conditions générales d'utilisation de la plateforme MIYASHI." canonical="/terms" />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-display font-bold mb-2">Conditions d'Utilisation</h1>
            <p className="text-muted-foreground mb-8">Dernière mise à jour : Février 2026</p>

            <label className="flex items-center gap-2 text-sm mb-6">Pays :
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent border border-foreground/15 rounded-lg px-2 py-1">
                {COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c} className="bg-background">{n}</option>)}
              </select>
            </label>
            {docs.map((d) => (
              <section key={d.id} className="mb-10 rounded-2xl border border-foreground/10 p-6">
                <p className="text-xs uppercase tracking-widest text-primary mb-1">{DOC_LABEL[d.doc_type]} · version {d.version} · {new Date(d.published_at).toLocaleDateString("fr-FR")}</p>
                <h2 className="text-2xl font-display font-bold mb-3">{d.title}</h2>
                <div className="text-muted-foreground leading-relaxed"><SimpleMarkdown text={d.content} /></div>
              </section>
            ))}
            <div className="space-y-8">
              {!docs.some((d) => d.doc_type === "terms") && sections.map((s, i) => (
                <motion.section key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <h2 className="text-xl font-display font-bold text-foreground mb-2">{s.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{s.content}</p>
                </motion.section>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
