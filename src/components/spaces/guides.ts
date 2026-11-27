// What each space's guide says. Steps are ticked from real data (get_space_progress).
export type SpaceKey = "acheteur" | "vendeur" | "livreur" | "prestataire" | "freelance" | "recruteur";
export type GuideStep = { key: string; title: string; why: string; action: { label: string; tab?: string; href?: string } };
export type Guide = {
  intro: string;
  steps: GuideStep[];
  how: { title: string; points: string[] }[];
  safety: string[];
  faq: { q: string; a: string }[];
};

const account = {
  name: { key: "name", title: "Indiquez votre nom complet", why: "Vos interlocuteurs savent à qui ils ont affaire.", action: { label: "Mon profil", href: "/profile" } },
  photo: { key: "photo", title: "Ajoutez une photo de profil", why: "Un visage inspire confiance : les profils avec photo reçoivent plus de réponses.", action: { label: "Ajouter", href: "/profile" } },
  phone: { key: "phone", title: "Ajoutez votre numéro", why: "Pour les livraisons, les rendez-vous et les alertes WhatsApp.", action: { label: "Ajouter", href: "/profile" } },
  email: { key: "email_verified", title: "Confirmez votre adresse e-mail", why: "Nécessaire pour récupérer votre compte et recevoir vos reçus.", action: { label: "Paramètres", href: "/settings" } },
  kyc: { key: "kyc", title: "Faites vérifier votre identité", why: "Badge « Vérifié », retraits plus rapides et plus de confiance des clients.", action: { label: "Envoyer mes pièces", href: "/profile?tab=kyc" } },
  mfa: { key: "mfa", title: "Activez la double authentification", why: "Même avec votre mot de passe, personne ne peut entrer sans votre téléphone.", action: { label: "Activer", href: "/settings" } },
} satisfies Record<string, GuideStep>;

export const GUIDES: Record<SpaceKey, Guide> = {
  acheteur: {
    intro: "Achetez des produits et des services en toute sérénité : votre argent reste bloqué chez MIYASHI tant que vous n'avez pas reçu ce que vous avez commandé.",
    steps: [
      account.name, account.phone, account.email,
      { key: "address", title: "Enregistrez une adresse de livraison", why: "Commande en deux clics, livreur qui trouve du premier coup (repère, quartier).", action: { label: "Mes adresses", href: "/addresses" } },
      { key: "wallet", title: "Rechargez votre portefeuille", why: "Payez instantanément en mobile money (TMoney, Flooz, MTN, Wave) ou par carte.", action: { label: "Recharger", href: "/wallet" } },
      { key: "first_order", title: "Passez votre première commande", why: "Le paiement est protégé jusqu'à la réception.", action: { label: "Voir le marché", href: "/marketplace" } },
      { key: "review", title: "Laissez un avis après réception", why: "Vous aidez les autres acheteurs et récompensez les bons vendeurs.", action: { label: "Mes commandes", tab: "commandes" } },
    ],
    how: [
      { title: "Commander", points: ["Choisissez un produit, sa variante (taille, couleur) et la quantité.", "Payez avec votre portefeuille, en mobile money, ou à la livraison quand le vendeur l'accepte.", "Négociez si le vendeur accepte les offres, ou rejoignez un achat groupé pour un meilleur prix."] },
      { title: "Votre argent est protégé", points: ["Le paiement est placé en séquestre : le vendeur ne le reçoit qu'après votre confirmation.", "Sans réclamation de votre part, il est libéré 7 jours après la remise.", "Un problème ? Ouvrez un litige depuis la commande : l'argent reste bloqué pendant l'examen."] },
      { title: "Recevoir", points: ["Suivez votre colis en direct : préparation, prise en charge, en route, livré.", "Paiement à la livraison : ne donnez le code à 6 chiffres qu'une fois le colis en main et vérifié.", "Point relais : retirez votre colis près de chez vous avec votre code."] },
    ],
    safety: [
      "Ne payez jamais en dehors de MIYASHI : hors de la plateforme, vous perdez la protection du séquestre.",
      "Ne communiquez jamais votre mot de passe ni votre code de remise par message ou par téléphone.",
      "Vérifiez le colis devant le livreur avant de donner votre code.",
      "Un prix beaucoup trop bas ou une demande de paiement « urgent » ? Signalez l'annonce.",
    ],
    faq: [
      { q: "Quand le vendeur est-il payé ?", a: "Quand vous confirmez la réception, ou automatiquement 7 jours après la remise si vous n'avez rien signalé." },
      { q: "Comment me faire rembourser ?", a: "Ouvrez un litige depuis la commande avec photos. Si le litige vous donne raison, le montant revient sur votre portefeuille." },
      { q: "Puis-je annuler ?", a: "Oui, tant que le vendeur n'a pas expédié. Le paiement vous est rendu immédiatement." },
    ],
  },
  vendeur: {
    intro: "Ouvrez votre boutique, vendez dans toute l'Afrique de l'Ouest et soyez payé sur votre portefeuille dès que l'acheteur confirme la réception.",
    steps: [
      { key: "shop", title: "Créez votre boutique", why: "Une page à votre nom avec votre logo, vos horaires et votre adresse de retrait.", action: { label: "Ma boutique", href: "/shop/manage" } },
      { key: "logo", title: "Ajoutez un logo", why: "Votre boutique est reconnue au premier coup d'œil.", action: { label: "Personnaliser", href: "/shop/manage" } },
      { key: "first_product", title: "Publiez votre premier produit", why: "L'assistant peut rédiger l'annonce à partir de vos photos.", action: { label: "Ajouter un produit", href: "/create?type=product" } },
      { key: "photos", title: "Mettez au moins 3 photos par produit", why: "Les annonces avec plusieurs photos se vendent nettement mieux.", action: { label: "Mes produits", tab: "produits" } },
      { key: "five_products", title: "Atteignez 5 produits actifs", why: "Une boutique fournie inspire confiance et apparaît plus souvent.", action: { label: "Ajouter", href: "/create?type=product" } },
      account.kyc,
      { key: "cod", title: "Acceptez le paiement à la livraison", why: "Beaucoup d'acheteurs préfèrent payer en main propre.", action: { label: "Réglages", href: "/shop/manage" } },
      { key: "first_sale", title: "Réalisez votre première vente", why: "Partagez le lien de votre boutique sur WhatsApp et Facebook.", action: { label: "Mes commandes", tab: "commandes" } },
    ],
    how: [
      { title: "Publier", points: ["Photos nettes à la lumière du jour, titre précis (marque, taille, couleur), prix honnête.", "Variantes (taille, couleur) avec leur propre stock et prix.", "Prix dégressifs pour la vente en gros, quantité minimum de commande."] },
      { title: "Expédier", points: ["Préparez la commande dès qu'elle arrive : l'acheteur est prévenu à chaque étape.", "Choisissez un livreur MIYASHI, un point relais ou le retrait en boutique.", "Paiement à la livraison : le livreur vérifie le code de l'acheteur."] },
      { title: "Être payé", points: ["L'argent est en séquestre pendant la livraison, puis versé sur votre portefeuille (commission 10 %).", "Retirez vers votre mobile money depuis le portefeuille.", "Factures automatiques pour chaque commande payée."] },
    ],
    safety: [
      "N'expédiez jamais sans commande payée ou confirmée en paiement à la livraison sur MIYASHI.",
      "Ne donnez pas votre numéro pour finaliser hors plateforme : vous perdez la protection en cas de litige.",
      "Gardez une photo du colis emballé : elle sert de preuve en cas de réclamation.",
    ],
    faq: [
      { q: "Combien coûte MIYASHI ?", a: "L'ouverture est gratuite. Une commission de 10 % est prélevée sur les ventes réalisées." },
      { q: "Quand suis-je payé ?", a: "À la confirmation de réception par l'acheteur, ou 7 jours après la remise sans litige." },
      { q: "Et si l'acheteur ouvre un litige ?", a: "Répondez avec vos preuves (photos, suivi). L'équipe tranche sur les éléments des deux côtés." },
    ],
  },
  livreur: {
    intro: "Livrez dans votre zone à moto, tricycle ou voiture, choisissez vos courses et soyez payé sur votre portefeuille à chaque livraison confirmée.",
    steps: [
      { key: "driver_profile", title: "Créez votre profil de livreur", why: "Zone, véhicule et permis : les vendeurs vous trouvent.", action: { label: "Inscription", href: "/driver-registration" } },
      account.kyc,
      { key: "contract", title: "Signez la charte du livreur", why: "Vos engagements (honnêteté, colis intacts, discrétion) et votre badge.", action: { label: "Signer", href: "/driver-registration" } },
      account.phone,
      { key: "available", title: "Passez en « Disponible »", why: "Vous recevez les demandes de course de votre zone.", action: { label: "Vue d'ensemble", tab: "vue" } },
      { key: "first_delivery", title: "Faites votre première livraison", why: "Acceptez une course, récupérez le colis, livrez.", action: { label: "Courses", tab: "livraisons" } },
      { key: "proof", title: "Enregistrez une preuve de remise", why: "Photo ou code du client : elle vous protège en cas de réclamation.", action: { label: "Courses", tab: "livraisons" } },
    ],
    how: [
      { title: "Accepter une course", points: ["Les demandes de votre zone apparaissent avec la distance et le prix.", "Le supplément de nuit est ajouté automatiquement.", "Regroupez plusieurs colis en une tournée pour gagner plus."] },
      { title: "Livrer", points: ["Vérifiez l'état du colis chez le vendeur avant de partir.", "Chez le client, demandez le code à 6 chiffres ou prenez une photo de la remise.", "En paiement à la livraison, encaissez uniquement le montant affiché."] },
      { title: "Être payé", points: ["Votre part est versée sur votre portefeuille à la livraison confirmée.", "Bonus fidélité selon vos notes (état du colis, ponctualité, politesse).", "Retrait vers mobile money à tout moment."] },
    ],
    safety: [
      "N'ouvrez jamais un colis et ne transportez rien hors d'une course MIYASHI.",
      "Ne remettez pas le colis sans code ou sans photo de remise.",
      "Portez votre casque et respectez le code de la route : aucune course ne vaut un accident.",
      "En cas de problème (client absent, adresse fausse), signalez-le depuis la course.",
    ],
    faq: [
      { q: "Combien je gagne par course ?", a: "Le prix dépend de la distance et du véhicule ; vous le voyez avant d'accepter. MIYASHI garde une commission sur la livraison." },
      { q: "Le client est absent, que faire ?", a: "Appelez-le, patientez quelques minutes puis signalez l'absence depuis la course : le colis repart chez le vendeur ou au point relais." },
    ],
  },
  prestataire: {
    intro: "Proposez vos services (artisanat, beauté, réparation, événementiel, conseil…), vendez des formules, envoyez devis et factures, et gérez vos rendez-vous.",
    steps: [
      { key: "pro_profile", title: "Complétez votre profil pro", why: "Accroche, zone d'intervention, délai de réponse, certifications.", action: { label: "Profil pro", tab: "profil" } },
      account.photo,
      { key: "first_service", title: "Publiez un service", why: "Décrivez ce que vous faites, avec des photos de vos réalisations.", action: { label: "Ajouter", href: "/create?type=service" } },
      { key: "packs", title: "Créez vos formules Basique, Standard, Premium", why: "Le client choisit et paie en un clic, sans aller-retour.", action: { label: "Formules", tab: "formules" } },
      { key: "availability", title: "Indiquez vos disponibilités", why: "Les clients réservent un créneau libre directement.", action: { label: "Agenda", href: "/bookings" } },
      { key: "portfolio", title: "Ajoutez des réalisations", why: "Vos meilleurs travaux rassurent avant la première commande.", action: { label: "Portfolio", href: "/profile" } },
      account.kyc,
      { key: "first_quote", title: "Envoyez votre premier devis", why: "Pour les demandes sur mesure : le client accepte et paie en ligne.", action: { label: "Devis", href: "/quotes" } },
      { key: "first_invoice", title: "Émettez une facture", why: "Numérotée automatiquement, imprimable et envoyée au client.", action: { label: "Factures", tab: "factures" } },
    ],
    how: [
      { title: "Vendre", points: ["Formules à prix fixe : le client paie et le travail démarre.", "Devis sur mesure : lignes, quantités, validité ; accepté en un clic.", "Rendez-vous : le client réserve un créneau dans vos disponibilités."] },
      { title: "Réaliser", points: ["Suivez chaque prestation par étapes (brief, réalisation, livraison, retouches).", "Échangez avec le client dans la messagerie, partagez des photos.", "Le client confirme la fin : l'argent est versé sur votre portefeuille."] },
      { title: "Gérer", points: ["Factures numérotées (F2026-0001…), TVA et remise calculées.", "Liste de vos clients avec leurs commandes et dépenses.", "Statistiques : chiffre d'affaires, devis acceptés, rendez-vous à venir."] },
    ],
    safety: [
      "Faites payer via MIYASHI : le séquestre vous garantit d'être payé pour un travail livré.",
      "Écrivez clairement ce qui est inclus dans chaque formule pour éviter les malentendus.",
      "Une facture émise ne se modifie plus : annulez-la et créez-en une nouvelle si besoin.",
    ],
    faq: [
      { q: "Formule ou devis ?", a: "La formule pour les prestations standard, le devis pour le sur-mesure. Les deux sont payés d'avance et protégés." },
      { q: "Le client conteste la prestation ?", a: "Ouvrez la discussion, proposez une retouche. Sinon, l'équipe examine le litige avec les échanges et les photos." },
    ],
  },
  freelance: {
    intro: "Trouvez des missions et des emplois qui vous correspondent, postulez en quelques minutes et passez vos entretiens en ligne, en direct ou enregistrés.",
    steps: [
      { key: "freelance_profile", title: "Donnez un titre à votre profil", why: "Ex. « Développeuse web React », « Comptable OHADA ».", action: { label: "Profil & CV", tab: "profil" } },
      { key: "skills", title: "Ajoutez au moins 3 compétences", why: "Elles servent à calculer votre correspondance avec chaque offre.", action: { label: "Compléter", tab: "profil" } },
      { key: "languages", title: "Indiquez vos langues", why: "Beaucoup d'offres demandent le français, l'anglais ou une langue locale.", action: { label: "Compléter", tab: "profil" } },
      { key: "cv", title: "Déposez votre CV", why: "Envoyé avec vos candidatures, visible seulement des recruteurs à qui vous postulez.", action: { label: "Déposer", tab: "profil" } },
      { key: "portfolio", title: "Ajoutez des réalisations", why: "Projets, liens, photos : la preuve de votre savoir-faire.", action: { label: "Portfolio", href: "/profile" } },
      account.photo,
      { key: "first_application", title: "Postulez à une offre", why: "Commencez par celles où votre correspondance est la plus haute.", action: { label: "Offres pour vous", tab: "offres" } },
    ],
    how: [
      { title: "Postuler", points: ["Chaque offre affiche votre correspondance : compétences, expérience, langues, lieu.", "Répondez aux questions du recruteur ; certaines sont éliminatoires.", "Suivez l'avancement : reçue, en examen, présélectionnée, entretien, proposition."] },
      { title: "Entretiens", points: ["En direct : rejoignez la salle vidéo à l'heure prévue depuis « Entretiens ».", "Enregistré : répondez aux questions quand vous voulez avant l'échéance, avec un temps de préparation.", "Testez votre caméra et votre micro avant de commencer, dans un endroit calme."] },
      { title: "Travailler", points: ["Mission freelance : devis et paiement sous séquestre, livrables suivis par étapes.", "Emploi : le recruteur vous contacte pour la suite (contrat, date de début)."] },
    ],
    safety: [
      "Un recruteur ne vous demande jamais de payer pour obtenir un poste ou une formation obligatoire.",
      "Ne donnez pas vos codes, votre mot de passe ni vos papiers originaux.",
      "Pour une mission, faites payer via MIYASHI : hors plateforme, aucune garantie de paiement.",
      "Les entretiens enregistrés ne servent qu'au recruteur de l'offre ; votre accord est demandé avant chaque enregistrement.",
    ],
    faq: [
      { q: "Comment est calculée ma correspondance ?", a: "Compétences demandées (50 points), expérience (20), langues (10), lieu (10) et questions (10), plus un bonus pour les atouts. C'est un repère : le recruteur lit toujours votre dossier." },
      { q: "Qui voit mon CV ?", a: "Vous, et seulement les recruteurs des offres auxquelles vous avez postulé." },
      { q: "L'IA décide-t-elle à la place du recruteur ?", a: "Non. Elle résume et évalue le contenu de vos réponses ; la décision appartient au recruteur. Votre apparence, votre accent ou vos émotions ne sont jamais analysés." },
    ],
  },
  recruteur: {
    intro: "Publiez vos offres, recevez des candidatures triées par correspondance, faites passer des entretiens vidéo en direct ou enregistrés et recrutez en équipe.",
    steps: [
      { key: "company", title: "Présentez votre entreprise", why: "Nom, secteur, taille, logo : les candidats postulent plus volontiers.", action: { label: "Entreprise", tab: "entreprise" } },
      { key: "first_job", title: "Publiez votre première offre", why: "Missions, compétences, conditions : plus c'est précis, meilleur est le tri.", action: { label: "Nouvelle offre", tab: "offres" } },
      { key: "screening", title: "Ajoutez des questions de présélection", why: "Ex. « Avez-vous le permis ? » éliminatoire : vous gagnez du temps.", action: { label: "Mes offres", tab: "offres" } },
      { key: "reviewed", title: "Faites avancer une candidature", why: "Le candidat est prévenu à chaque étape : bonne image de votre entreprise.", action: { label: "Candidats", tab: "pipeline" } },
      { key: "interview", title: "Programmez un entretien", why: "En direct en vidéo, ou enregistré avec l'assistant que le candidat passe quand il veut.", action: { label: "Entretiens", tab: "entretiens" } },
      { key: "template", title: "Enregistrez vos messages types", why: "Invitation, refus, proposition : répondez à tous, vite et poliment.", action: { label: "Modèles", tab: "modeles" } },
      account.mfa,
    ],
    how: [
      { title: "Trier les candidatures", points: ["Chaque candidature reçoit une correspondance sur 100, expliquée : compétences trouvées et manquantes, expérience, langues, lieu, questions.", "Les réponses éliminatoires sont signalées ; filtrez par score, étiquette ou note.", "Mode anonyme : nom et photo masqués tant que la candidature n'est pas présélectionnée, pour un tri plus équitable.", "Analyse détaillée : points forts, points d'attention et questions à poser (plus fine avec l'IA activée)."] },
      { title: "Entretiens", points: ["Vidéo en direct dans le navigateur, sans logiciel : lien envoyé au candidat, grille d'évaluation pendant l'appel.", "Entretien enregistré : vos questions (ou celles générées pour le poste), temps de préparation et de réponse, transcription.", "Rapport : note par réponse, mots-clés attendus, exemple concret, résultat, débit et hésitations, et un bilan à confirmer en écoutant les vidéos."] },
      { title: "Décider", points: ["Comparez les candidats côte à côte, notez-les, ajoutez des notes privées.", "Déplacez plusieurs candidatures à la fois avec un message type.", "Vivier : retrouvez et contactez les talents ouverts aux opportunités."] },
    ],
    safety: [
      "La décision reste humaine : les scores et rapports sont une aide, pas un verdict.",
      "N'évaluez jamais l'âge, le genre, l'origine, la religion ou la situation familiale : c'est discriminatoire et interdit.",
      "MIYASHI n'analyse ni les visages ni les émotions : ces techniques sont peu fiables et biaisées.",
      "Ne demandez jamais d'argent à un candidat. Toute offre qui le fait est supprimée.",
    ],
    faq: [
      { q: "Comment fonctionne le score ?", a: "Il compare l'offre au profil : compétences (pondérables de 1 à 3), expérience minimale, langues, lieu et questions. Modifiez vos critères puis « Recalculer » pour mettre à jour toutes les candidatures." },
      { q: "Les candidats voient-ils mes notes ?", a: "Non. Ils voient l'étape de leur candidature et les messages que vous choisissez de leur envoyer." },
      { q: "Faut-il une clé IA ?", a: "Non : le tri, les questions et les rapports fonctionnent avec des règles. L'IA ajoute des résumés et des évaluations plus fines une fois activée par l'administrateur." },
    ],
  },
};
