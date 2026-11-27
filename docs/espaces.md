# Espaces (rôles) : règles

Un compte MIYASHI a toujours l'espace **Acheteur**. Il peut ouvrir au plus **3 espaces professionnels** parmi Vendeur, Prestataire, Freelance, Recruteur et Livreur. Le compte **administrateur** a tous les espaces, sans limite.

## Espaces incompatibles

| Espaces | Raison |
| --- | --- |
| Recruteur + Freelance | On ne recrute pas et on ne candidate pas avec le même compte : un recruteur verrait les candidatures de ses concurrents et pourrait répondre à ses propres offres. |
| Vendeur + Freelance | Une boutique est une activité commerciale ; l'espace Freelance sert à postuler à des offres. |
| Vendeur + Livreur | Un vendeur ne livre pas ses propres commandes : la preuve de remise libère l'argent du séquestre. |

Après la fermeture d'un espace, un espace incompatible ne peut être ouvert que **30 jours** plus tard (pas d'aller-retour pour consulter les données de l'autre côté). L'administrateur peut lever ce délai, mais pas l'incompatibilité.

Les règles sont dans la table `role_conflicts` et les fonctions `space_limit()` et `space_cooldown()` (migration `20261130100000_space_rules.sql`).

## Ouvrir et fermer

- Ouvrir : `assign_own_role(role)`. Pour Livreur, `register_driver(...)` (zone, véhicule, permis) ; `assign_own_role('driver')` est refusé sans inscription.
- Fermer : `deactivate_own_role(role)`, refusé tant qu'une commande, un rendez-vous, un entretien, une proposition d'embauche ou une course est en cours. La fermeture retire les annonces de l'espace (produits, services, offres), retire les candidatures en attente et sort le profil du vivier.
- Voir ce qui est possible et pourquoi : `get_space_options()`.
- Historique : table `user_role_events`.

L'application ne peut plus écrire directement dans `user_roles`.

## Contrôles

Chaque écriture qui appartient à un espace vérifie que son propriétaire a cet espace, par un trigger `enforce_space` (produits, services, offres, candidatures, boutiques, promotions, codes promo, campagnes, boosts, devis, factures, entretiens, profils pro, livreurs…). Le trigger s'applique aussi aux fonctions de la base (par exemple `apply_to_job` ou `send_quote`). Une annonce d'un espace fermé ne peut pas être remise en ligne.

Côté interface, `useSpaces()` (`src/hooks/useSpaces.tsx`) donne les espaces du compte et `can(fonction)`. Les pages réservées utilisent `<RequireSpace>`, les boutons et menus `<IfSpace>` (`src/components/spaces/SpaceAccess.tsx`).

Tests : `supabase/tests/space_rules_e2e.sql` (lancés par `scripts/db-test.sh`).
