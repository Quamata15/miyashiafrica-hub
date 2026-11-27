import { useParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, BookOpen, ShoppingBag, Truck, CreditCard, UserCheck, Briefcase, Users, Shield, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Article {
  title: string;
  content: string;
}

interface GuideData {
  icon: React.ElementType;
  title: string;
  description: string;
  articles: Article[];
}

const guidesData: Record<string, GuideData> = {
  "acheter": {
    icon: ShoppingBag,
    title: "Acheter sur MIYASHI",
    description: "Tout savoir pour parcourir, commander et payer en toute sécurité.",
    articles: [
      { title: "Comment créer un compte acheteur ?", content: "Rendez-vous sur la page d'inscription, renseignez votre email et un mot de passe sécurisé. Confirmez votre adresse email via le lien reçu. Vous pouvez ensuite compléter votre profil avec une photo, une bio et votre localisation pour une meilleure expérience." },
      { title: "Comment rechercher un produit ?", content: "Utilisez la barre de recherche en haut de page ou parcourez les catégories depuis le Marketplace. Vous pouvez filtrer par prix, localisation, catégorie et note. L'option de tri permet d'afficher les résultats par prix croissant/décroissant ou par nouveauté." },
      { title: "Comment passer une commande ?", content: "Cliquez sur un produit pour voir ses détails, puis ajoutez-le au panier. Depuis le panier, cliquez sur 'Commander'. Renseignez votre adresse de livraison et choisissez votre mode de paiement. Le montant est sécurisé en escrow jusqu'à réception." },
      { title: "Comment suivre ma commande ?", content: "Depuis votre tableau de bord, accédez à l'onglet 'Commandes'. Chaque commande affiche son statut en temps réel : en attente, confirmée, en préparation, expédiée, livrée. Vous recevez une notification à chaque changement de statut." },
      { title: "Comment confirmer la réception ?", content: "Quand votre commande est livrée, un bouton 'Confirmer la réception' apparaît. Cette action libère le paiement au vendeur. Si le produit ne correspond pas, vous pouvez ouvrir un litige avant de confirmer." },
      { title: "Comment laisser un avis ?", content: "Après réception, rendez-vous sur la page du produit ou du vendeur. Attribuez une note de 1 à 5 étoiles et laissez un commentaire. Les avis vérifiés (liés à un achat) sont marqués d'un badge spécial." },
      { title: "Comment ajouter un produit aux favoris ?", content: "Cliquez sur l'icône cœur sur n'importe quel produit ou service. Retrouvez tous vos favoris depuis le menu 'Favoris'. Vous serez notifié si le prix d'un favori baisse." },
      { title: "Comment contacter un vendeur ?", content: "Sur le profil public du vendeur, cliquez sur 'Contacter'. Vous accédez à la messagerie interne. Vous pouvez poser des questions sur un produit, négocier ou demander des informations complémentaires." },
    ],
  },
  "livraisons": {
    icon: Truck,
    title: "Livraisons",
    description: "Suivi en temps réel, tarifs et gestion des livraisons.",
    articles: [
      { title: "Comment fonctionne la livraison ?", content: "Quand un vendeur confirme votre commande, une demande de livraison est créée automatiquement. Un livreur disponible dans la zone accepte la course. Vous pouvez suivre l'avancement en temps réel sur la carte GPS." },
      { title: "Comment sont calculés les frais de livraison ?", content: "Les frais dépendent de la distance (tarif au km), du type de véhicule (moto, tricycle, voiture, camionnette) et de l'horaire (supplément de 25% pour les livraisons de nuit). Le prix est affiché avant confirmation." },
      { title: "Comment suivre ma livraison en temps réel ?", content: "Depuis votre tableau de bord ou la page de commande, cliquez sur 'Suivre la livraison'. La carte GPS affiche la position du livreur en temps réel, avec l'estimation du temps d'arrivée." },
      { title: "Que faire si ma livraison est en retard ?", content: "Contactez d'abord le livreur via la messagerie de la commande. Si le problème persiste, ouvrez un litige depuis votre tableau de bord. Notre équipe intervient sous 24h." },
      { title: "Comment devenir livreur ?", content: "Rendez-vous sur 'Devenir livreur' depuis le menu. Remplissez le formulaire d'inscription avec votre zone de livraison, type de véhicule et numéro de permis. Après vérification KYC, vous pourrez accepter des courses." },
      { title: "Comment noter un livreur ?", content: "Après chaque livraison, vous pouvez noter le livreur sur 3 critères : ponctualité, politesse et état du produit. La note globale est calculée automatiquement et visible sur le profil du livreur." },
    ],
  },
  "paiements": {
    icon: CreditCard,
    title: "Paiements",
    description: "Mobile Money, portefeuille, escrow et remboursements.",
    articles: [
      { title: "Quels modes de paiement sont acceptés ?", content: "MIYASHI accepte les paiements par Mobile Money (Flooz, T-Money), les cartes bancaires et le solde du portefeuille MIYASHI. Chaque méthode est sécurisée et les fonds sont protégés par notre système d'escrow." },
      { title: "Comment fonctionne l'escrow ?", content: "Quand vous payez, l'argent est retenu en escrow (séquestre). Le vendeur reçoit le paiement uniquement quand vous confirmez la réception du produit. Cela protège les deux parties en cas de problème." },
      { title: "Comment alimenter mon portefeuille ?", content: "Depuis la page 'Portefeuille', cliquez sur 'Recharger'. Choisissez votre méthode de paiement et le montant. Le solde est crédité instantanément et peut être utilisé pour vos achats." },
      { title: "Comment retirer mes gains ?", content: "Les vendeurs et livreurs peuvent retirer leurs gains depuis le portefeuille. Cliquez sur 'Retirer', indiquez le montant et le numéro Mobile Money. Le retrait est traité sous 24-48h." },
      { title: "Comment demander un remboursement ?", content: "Si vous n'avez pas reçu votre commande ou si le produit est défectueux, ouvrez un litige depuis votre tableau de bord. Si le litige est résolu en votre faveur, le montant est remboursé sur votre portefeuille." },
    ],
  },
  "vendre": {
    icon: UserCheck,
    title: "Vendre des produits",
    description: "Publier, gérer et promouvoir vos articles en vente.",
    articles: [
      { title: "Comment devenir vendeur ?", content: "Depuis votre profil, ajoutez le rôle 'Vendeur' dans l'onglet 'Rôles'. Vous pouvez ensuite créer vos premières annonces. Pour plus de crédibilité, complétez la vérification KYC." },
      { title: "Comment créer une annonce ?", content: "Cliquez sur '+ Créer' dans le menu. Sélectionnez 'Produit', ajoutez un titre clair, une description détaillée, le prix et au moins 3 photos de qualité. Choisissez la catégorie appropriée et publiez." },
      { title: "Comment gérer mon stock ?", content: "Depuis le tableau de bord vendeur, l'onglet 'Mes Produits' affiche tous vos articles. Vous pouvez modifier le stock, le prix ou la description à tout moment. Une alerte vous prévient quand le stock descend sous 5 unités." },
      { title: "Comment gérer les commandes reçues ?", content: "Les nouvelles commandes apparaissent dans l'onglet 'Commandes'. Confirmez la commande pour lancer la préparation, puis marquez-la comme expédiée. Le livreur est automatiquement notifié." },
      { title: "Comment créer une promotion ?", content: "Depuis le tableau de bord, accédez à 'Promotions'. Créez une réduction en pourcentage ou en montant fixe, définissez les dates de validité et les produits concernés." },
      { title: "Comment créer un code promo ?", content: "Dans 'Promotions', cliquez sur 'Nouveau code promo'. Définissez le code, le type de réduction, le montant minimum de commande et le nombre maximal d'utilisations." },
      { title: "Comment exporter mes données ?", content: "L'onglet 'Documents' dans le tableau de bord vous permet d'exporter vos commandes, produits et statistiques au format CSV ou PDF pour votre comptabilité." },
    ],
  },
  "services": {
    icon: Briefcase,
    title: "Services & Prestataires",
    description: "Offrir vos services et gérer les prestations.",
    articles: [
      { title: "Comment devenir prestataire ?", content: "Ajoutez le rôle 'Prestataire' depuis votre profil. Vous pourrez ensuite publier des services. Les prestataires vérifiés (KYC) bénéficient d'un badge de confiance visible sur leur profil." },
      { title: "Comment publier un service ?", content: "Cliquez sur '+ Créer' et sélectionnez 'Service'. Décrivez clairement votre prestation, le délai de livraison, le type de tarification (fixe ou horaire) et ajoutez des photos de vos réalisations." },
      { title: "Comment fonctionnent les étapes (milestones) ?", content: "Les milestones permettent de découper une prestation en étapes. Le client valide chaque étape avant de passer à la suivante. Cela assure un suivi clair et une livraison progressive." },
      { title: "Comment gérer les demandes de clients ?", content: "Les demandes arrivent par la messagerie interne. Discutez des détails, proposez un devis et créez la commande. Le paiement est sécurisé en escrow pendant toute la durée de la prestation." },
      { title: "Comment booster mon service ?", content: "Depuis la page 'Booster', choisissez votre service, la durée et le rayon géographique. Les services boostés apparaissent en priorité dans les résultats de recherche." },
    ],
  },
  "freelance": {
    icon: Users,
    title: "Freelance & Emplois",
    description: "Postuler, recruter et gérer les missions.",
    articles: [
      { title: "Comment créer un profil freelance ?", content: "Ajoutez le rôle 'Freelance' depuis votre profil, puis complétez l'onglet Freelance : titre professionnel, compétences, taux horaire, années d'expérience et disponibilité. Un profil complet attire plus de clients." },
      { title: "Comment postuler à une offre ?", content: "Parcourez les offres d'emploi dans l'espace Freelance. Cliquez sur une offre pour voir les détails, puis postulez avec une lettre de motivation et votre tarif proposé. L'employeur recevra votre candidature." },
      { title: "Comment publier une offre d'emploi ?", content: "Ajoutez le rôle 'Recruteur' et cliquez sur '+ Créer' > 'Offre d'emploi'. Décrivez le poste, les compétences requises, le budget et la deadline. Les freelancers qualifiés seront notifiés." },
      { title: "Comment gérer les candidatures ?", content: "Depuis le tableau de bord recruteur, consultez les candidatures reçues. Consultez le profil et le portfolio de chaque freelancer, puis acceptez ou refusez les candidatures." },
    ],
  },
  "securite": {
    icon: Shield,
    title: "Sécurité & Vérification",
    description: "KYC, protection du compte et confidentialité.",
    articles: [
      { title: "Qu'est-ce que la vérification KYC ?", content: "La vérification KYC (Know Your Customer) confirme votre identité. Soumettez une pièce d'identité et un justificatif de domicile. Une fois approuvé, vous recevez le badge 'Vérifié' qui inspire confiance aux autres utilisateurs." },
      { title: "Comment vérifier mon compte ?", content: "Depuis votre profil, accédez à l'onglet 'Vérification'. Téléchargez vos documents d'identité. Notre équipe examine votre demande sous 24-48h. Vous recevez une notification dès que le statut change." },
      { title: "Comment sécuriser mon compte ?", content: "Utilisez un mot de passe fort (au moins 8 caractères, avec chiffres et caractères spéciaux). Vous pouvez changer votre mot de passe à tout moment depuis les paramètres. Ne partagez jamais vos identifiants." },
      { title: "Comment signaler un problème ?", content: "Si vous rencontrez un comportement suspect ou un produit frauduleux, ouvrez un litige ou contactez le support via le formulaire de contact. Notre équipe enquête sur chaque signalement." },
      { title: "Comment fonctionne le système de litiges ?", content: "En cas de problème avec une commande, ouvrez un litige depuis votre tableau de bord. Décrivez le problème et joignez des preuves. Un médiateur MIYASHI intervient pour trouver une solution équitable." },
      { title: "Comment supprimer mes données ?", content: "Conformément au RGPD, vous pouvez demander la suppression de vos données en contactant le support. Nous traitons les demandes sous 30 jours." },
    ],
  },
  "boostage": {
    icon: Star,
    title: "Boostage & Promotions",
    description: "Mettre en avant vos produits et services.",
    articles: [
      { title: "Comment fonctionne le boost ?", content: "Le boost place votre produit ou service en tête des résultats de recherche dans une zone géographique définie. Choisissez la durée (1 jour, 1 semaine, 1 mois) et le rayon en km. Plus le rayon est grand, plus vous touchez d'acheteurs." },
      { title: "Combien coûte un boost ?", content: "Le prix dépend de la durée et du rayon choisis. Depuis la page 'Booster', un simulateur calcule le prix en temps réel. Les paiements se font via le portefeuille MIYASHI." },
      { title: "Comment suivre les performances de mon boost ?", content: "Le tableau de bord affiche les statistiques de vos boosts actifs : nombre de vues, clics et conversions. Comparez les performances avant et après le boost pour mesurer l'impact." },
    ],
  },
};

const slugMap: Record<string, string> = {
  "acheter-sur-miyashi": "acheter",
  "livraisons": "livraisons",
  "paiements": "paiements",
  "vendre-des-produits": "vendre",
  "services-prestataires": "services",
  "freelance-emplois": "freelance",
  "securite-verification": "securite",
  "boostage-promotions": "boostage",
};

const HelpGuide = () => {
  const { slug } = useParams<{ slug: string }>();
  const key = slug ? slugMap[slug] || slug : null;
  const guide = key ? guidesData[key] : null;

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 pt-header pb-10 flex flex-col items-center justify-center gap-4">
          <BookOpen className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Guide introuvable</h2>
          <Button asChild variant="outline"><Link to="/help">Retour au Centre d'aide</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = guide.icon;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title={`${guide.title} — Centre d'Aide MIYASHI`} description={guide.description} canonical={`/help/${slug}`} />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/help"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold">{guide.title}</h1>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">{guide.articles.length} articles</Badge>
            </div>

            <Card className="border-0 shadow-card">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {guide.articles.map((article, i) => (
                    <AccordionItem key={i} value={`article-${i}`} className="border-b last:border-0">
                      <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                        <span className="flex items-center gap-3 text-sm font-medium">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          {article.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-4 pl-14">
                        <p className="text-sm text-muted-foreground leading-relaxed">{article.content}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Vous n'avez pas trouvé la réponse ?</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" asChild><Link to="/faq">Consulter la FAQ</Link></Button>
                <Button asChild><Link to="/support">Contacter le support</Link></Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpGuide;
