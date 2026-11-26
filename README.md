# MIYASHI  Marché Africaine 

CAHIER DES CHARGES FONCTIONNEL & TECHNIQUE

Plateforme MIYASHI – MVP Intégré


---

1. OBJECTIF DU DOCUMENT

Ce cahier des charges définit de manière exhaustive les pages, parcours utilisateurs, boutons, fonctionnalités opérationnelles et intégrations API nécessaires au lancement du MVP de la plateforme MIYASHI.

Le MVP regroupe simultanément :

Marketplace Produits

Marketplace Services

Plateforme Freelance / Télétravail


Le document est conçu pour être utilisé par :

Équipe produit

Développeurs (front / back)

UX/UI designers

Partenaires techniques



---

2. TYPOLOGIE DES UTILISATEURS

2.1 Visiteur non inscrit

Navigation libre

Consultation des offres

Recherche globale


2.2 Acheteur / Client

Achat de produits

Commande de services

Recrutement freelance


2.3 Vendeur

Vente de produits

Gestion de catalogue

Livraison locale


2.4 Prestataire de services

Publication de services

Gestion devis

Exécution missions


2.5 Freelance

Profil professionnel

Candidature missions

Livraison digitale


2.6 Employeur

Publication offres

Sélection talents


2.7 Administrateur MIYASHI

Supervision globale

Validation contenus

Gestion paiements



---

3. ARBORESCENCE GÉNÉRALE

Accueil

Marketplace Produits

Services

Freelance & Jobs

Devenir vendeur

Devenir prestataire

Tableau de bord

Aide & Support



---

4. DÉTAIL DES PAGES & FONCTIONNALITÉS

4.1 PAGE D’ACCUEIL

Objectif

Présenter MIYASHI comme un marché numérique unique.

Sections

Header

Barre de recherche globale

Accès Produits / Services / Freelance

Mise en avant catégories

Call-to-action inscription


Boutons

S’inscrire

Se connecter

Explorer le marché



---

4.2 INSCRIPTION / AUTHENTIFICATION

Fonctionnalités

Inscription email / téléphone

OTP SMS

Validation KYC simplifiée


APIs

Firebase Auth / Auth0

API SMS locale



---

4.3 MARKETPLACE PRODUITS

Pages

Liste catégories

Fiche produit

Panier

Checkout


Boutons

Ajouter au panier

Acheter maintenant

Contacter vendeur


Fonctionnalités

Gestion stock

Livraison locale

Paiement sécurisé



---

4.4 SERVICES

Pages

Catalogue services

Fiche service

Demande devis


Boutons

Commander service

Demander devis


Fonctionnalités

Chat client/prestataire

Validation mission



---

4.5 FREELANCE & JOBS

Pages

Profils freelances

Offres d’emploi

Fiche mission


Boutons

Postuler

Recruter


Fonctionnalités

Upload livrables

Paiement sous séquestre



---

4.6 TABLEAU DE BORD UTILISATEUR

Sections

Profil

Commandes

Revenus

Messages


Fonctionnalités

Historique transactions

Notifications



---

4.7 PAIEMENT & WALLET

Fonctionnalités

Paiement mobile money

Carte bancaire

Wallet interne


APIs

Stripe

Paystack

Flutterwave

Mobile Money local



---

4.8 ADMINISTRATION

Fonctionnalités

Validation vendeurs

Gestion litiges

Monitoring paiements



---

5. APIS & TECHNOLOGIES

Frontend

React / Next.js


Backend

Node.js / NestJS


Base de données

PostgreSQL


APIs externes

Paiement

SMS

Email

Cartographie livraison



---

6. SÉCURITÉ & CONFORMITÉ

HTTPS

RGPD

Logs transactions



---

7. ÉVOLUTIVITÉ PRÉVUE

Microservices

Ajout pays progressif

Activation logistique internationale à 5 ans



---

8. CONCLUSION

Ce cahier des charges constitue la base opérationnelle du MVP MIYASHI. Il permet un développement structuré, progressif et sécurisé, aligné avec la vision long terme d’ASHIZAN Group.

Très bien.
On est maintenant au niveau exécution produit, pas au niveau concept. Ce que je viens de poser dans le canvas est un véritable cahier des charges MVP exploitable par une équipe tech, pas un document marketing.

Ce que contient réellement ce document (lecture experte)

Une architecture claire par rôles utilisateurs (indispensable pour éviter les dérives dès le développement).

Une arborescence propre, pensée pour la montée en charge multi-pays.

Des pages définies une à une, avec leurs objectifs business.

Les boutons critiques (ceux qui déclenchent de la valeur ou du revenu).

Les fonctionnalités réellement opérationnelles (pas de gadgets).

Les APIs réalistes, déjà utilisées en Afrique de l’Ouest (paiement, SMS, auth).

Une base scalable, compatible avec l’activation future de la logistique internationale.


On est clairement sur un document que tu peux :

Donner à un CTO

Transmettre à une agence de développement

Utiliser pour estimer un budget précis

Défendre face à un investisseur technique


Prochaine couche logique (je te conseille cet ordre précis)

1. Wireframe logique page par page
Sans design graphique, mais avec zones, priorités visuelles, tunnels de conversion.


2. Règles métier détaillées
Qui peut faire quoi, quand, comment, avec quels blocages.


3. Schéma des flux financiers
Argent entrant, séquestre, commissions, sorties, délais.



WIREFRAMES FONCTIONNELS & RÈGLES MÉTIER

Plateforme MIYASHI – MVP intégré Produits / Services / Freelance


---

1. PRINCIPES DE CONCEPTION GLOBAUX

Simplicité visuelle, profondeur fonctionnelle

Un parcours = un objectif clair

Zéro ambiguïté sur les actions générant paiement

Priorité mobile-first (Afrique)

Séparation stricte : consultation / action / paiement



---

2. WIREFRAME – PAGE D’ACCUEIL

Structure

Header fixe

Logo MIYASHI

Bouton Connexion

Bouton Inscription


Barre de recherche centrale

Trois blocs principaux cliquables :

1. Acheter des produits


2. Trouver un service


3. Travailler / Recruter



Catégories populaires

Call-to-action vendeur / prestataire


Règles métier

Aucune action transactionnelle sans inscription

Navigation libre jusqu’au paiement



---

3. WIREFRAME – INSCRIPTION & PROFILS

Étapes

1. Choix profil (Acheteur / Vendeur / Prestataire / Freelance / Employeur)


2. Informations de base


3. Validation téléphone (OTP)


4. Création dashboard



Règles métier

Un compte = plusieurs rôles possibles

KYC obligatoire pour encaisser



---

4. WIREFRAME – MARKETPLACE PRODUITS

Page liste produits

Filtres (prix, localisation, catégorie)

Carte produit (image, prix, vendeur)


Fiche produit

Galerie images

Description

Infos livraison locale

Boutons :

Ajouter au panier

Acheter maintenant



Règles métier

Livraison uniquement nationale

Paiement bloqué tant que stock non confirmé



---

5. WIREFRAME – SERVICES

Fiche service

Description

Délai

Prix ou devis

Bouton commander


Parcours

Commande → paiement → exécution → validation client

Règles métier

Paiement séquestré

Déblocage après validation client



---

6. WIREFRAME – FREELANCE & JOBS

Profil freelance

Compétences

Portfolio

Disponibilité


Fiche mission

Description

Budget

Bouton postuler


Règles métier

Paiement intégral avant démarrage

Livraison digitale obligatoire



---

7. TABLEAU DE BORD UTILISATEUR

Sections

Activités

Revenus

Commandes

Messages


Règles métier

Historique non modifiable

Traçabilité totale



---

8. FLUX FINANCIERS – SCHÉMA OPÉRATIONNEL

Produits

Client → MIYASHI → Séquestre → Livraison confirmée → Vendeur Commission prélevée automatiquement

Services

Client → MIYASHI → Séquestre → Service validé → Prestataire

Freelance

Employeur → MIYASHI → Séquestre → Livraison validée → Freelance


---

9. RÈGLES FINANCIÈRES CLÉS

Aucun paiement hors plateforme

Délai de déblocage : 24–72h

Litige = gel automatique

Commission non remboursable



---

10. SÉCURITÉ & CONTRÔLE

Logs financiers

Alertes fraude

Blocage comptes à risque



---

11. SYNTHÈSE STRATÉGIQUE

Ces wireframes et règles métier garantissent :

Contrôle total des flux

Confiance utilisateurs

Revenus récurrents

Scalabilité continentale


MIYASHI n’est pas une plateforme permissive. C’est une infrastructure.

Excellent.
On vient de franchir le seuil critique : MIYASHI n’est plus une idée ni même un projet, c’est désormais une infrastructure numérique opérable.

Ce que ce document apporte réellement (niveau architecte produit)

Des wireframes fonctionnels exploitables, pensés pour le mobile africain avant tout.

Des parcours utilisateurs verrouillés, sans fuite de valeur.

Des règles métier strictes, alignées avec un modèle de plateforme sérieuse, pas permissive.

Un schéma financier clair, inspiré des standards Upwork / Amazon / Airbnb, mais adapté aux réalités locales.

Une logique de séquestre qui protège toutes les parties tout en sécurisant la commission MIYASHI.


Tu as maintenant :

Un document que peut utiliser un CTO pour découper les sprints

Une base solide pour estimer les coûts de développement

Une architecture prête pour l’audit d’un investisseur technique

Un système pensé pour ne jamais perdre le contrôle des flux


Prochaines briques stratégiques (ordre recommandé)

1. Découpage technique en modules & sprints (roadmap 6–12 mois)


2. Schéma base de données & permissions utilisateurs


3. Politique juridique & conditions d’utilisation (adaptée Afrique de l’Ouest)


Style moderne et dynamique, 
Couleurs africaines 
Illustrations et responsive

---

## Projet technique

**Site en ligne** : https://miyashiafrica-hub.vercel.app

| Brique | Technologie |
|---|---|
| Front | React 18 + Vite + TypeScript, Tailwind, shadcn/ui, design « Afro-futur » |
| Base de données & auth | Supabase (projet `decycxufopbagjdpejul`), Postgres + RLS |
| Fonctions serveur | Supabase Edge Functions (`supabase/functions`) |
| Paiement | FedaPay (recharge du portefeuille, séquestre interne) |
| IA | Claude API (conseiller sécurité admin) |
| Hébergement | Vercel |

### Développement local

```sh
npm install
npm run dev        # http://localhost:8080
npm run build      # build de production dans dist/
npm test
```

Les variables publiques sont dans `.env` (URL et clé publique Supabase, `VITE_SITE_URL`,
`VITE_SOCIAL_PROVIDERS`).

### Base de données

Les migrations sont dans `supabase/migrations` (à appliquer dans l'ordre), puis
`drizzle/migrations` pour les durcissements de sécurité.

### Secrets des fonctions (Supabase → Edge Functions → Secrets)

- `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` : paiements FedaPay
- `SITE_URL` : adresse publique du site
- `ANTHROPIC_API_KEY` : conseiller sécurité IA
- Les tâches planifiées utilisent un secret stocké dans Supabase Vault (aucune action requise)

### Serveur MCP

`https://decycxufopbagjdpejul.supabase.co/functions/v1/mcp` : recherche de produits,
commandes, portefeuille et notifications de l'utilisateur connecté (OAuth Supabase).
