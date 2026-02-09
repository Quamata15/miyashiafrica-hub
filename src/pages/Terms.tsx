import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

const Terms = () => {
  const sections = [
    { title: "1. Objet", content: "Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation de la plateforme MIYASHI, un service de marketplace, livraison et freelance opéré par ASHIZAN Group." },
    { title: "2. Inscription", content: "L'inscription sur la plateforme est gratuite. L'utilisateur s'engage à fournir des informations exactes et à jour. Tout utilisateur peut être acheteur, vendeur, prestataire de services, freelance, employeur ou livreur. La vérification KYC (au moins 2 pièces d'identité) est requise pour les transactions financières." },
    { title: "3. Paiements & Escrow", content: "Tous les paiements transitent par notre système d'escrow sécurisé. Les fonds sont bloqués lors de l'achat et libérés uniquement après validation de la réception par l'acheteur. Les moyens de paiement acceptés sont : cartes bancaires, Orange Money, Wave, TMoney. Les commissions de la plateforme sont déduites automatiquement." },
    { title: "4. Livraisons", content: "Les tarifs de livraison sont calculés par kilomètre selon le véhicule : Moto (550F/km), Tricycle (1000F/km), Voiture (1500F/km), Camionnette (2000F/km). Une commission fixe de 18% est prélevée sur les frais de livraison. Les livreurs sont évalués après chaque livraison sur la politesse, le temps de livraison et l'état du produit." },
    { title: "5. Abonnements Prestataires", content: "Les prestataires de services sont tenus de souscrire un abonnement annuel : Petite entreprise (10 000 FCFA), Moyenne (20 000 FCFA), Grande (35 000 FCFA). Le montant varie selon la taille de l'entreprise et la zone géographique." },
    { title: "6. Boostage & Promotions", content: "Les utilisateurs peuvent booster leurs produits, services ou profils pour une meilleure visibilité. Les prix de boostage sont compris entre 2 500 FCFA et 25 000 FCFA selon la durée et le rayon géographique choisi." },
    { title: "7. Responsabilités", content: "MIYASHI agit en tant qu'intermédiaire. La plateforme n'est pas responsable de la qualité des produits ou services vendus par les utilisateurs. Tout litige doit être signalé via le système de support." },
    { title: "8. Protection des données", content: "Les données personnelles sont traitées conformément à notre politique de confidentialité. Les documents KYC sont stockés de manière sécurisée et ne sont accessibles qu'aux administrateurs autorisés." },
    { title: "9. Modification", content: "MIYASHI se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront notifiés de toute modification substantielle." },
    { title: "10. Droit applicable", content: "Les présentes conditions sont régies par le droit togolais. Tout litige sera soumis aux tribunaux compétents de Lomé, Togo." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-display font-bold mb-2">Conditions d'Utilisation</h1>
            <p className="text-muted-foreground mb-8">Dernière mise à jour : Février 2026</p>

            <div className="space-y-8">
              {sections.map((s, i) => (
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
