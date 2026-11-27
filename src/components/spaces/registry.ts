// The six spaces of the dashboard, their role and their tabs.
import { ShoppingBag, Store, Bike, Wrench, Laptop, Building2, BarChart3, Package, Truck, FileText, BookOpen, Megaphone, Zap, FolderDown, History, Map, Briefcase, Layers, Receipt, Users,
  ListChecks, UserCog, Search, CalendarClock, Bookmark, MessageSquareText, Building } from "lucide-react";
import type { SpaceKey } from "./guides";

export type AppRole = "buyer" | "seller" | "provider" | "freelance" | "employer" | "driver";
export type TabDef = { key: string; label: string; icon: React.ElementType };
export type SpaceDef = { key: SpaceKey; label: string; role: AppRole; icon: React.ElementType; tagline: string; description: string; activation: "always" | "role" | "driver"; tabs: TabDef[] };

const guide: TabDef = { key: "guide", label: "Guide", icon: BookOpen };

export const SPACES: SpaceDef[] = [
  { key: "acheteur", label: "Acheteur", role: "buyer", icon: ShoppingBag, activation: "always", tagline: "Acheter en toute confiance",
    description: "Commandes, suivi de livraison, paiement protégé, devis et factures reçus.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "commandes", label: "Commandes", icon: Package }, { key: "suivi", label: "Suivi livraison", icon: Truck }, { key: "factures", label: "Devis & factures", icon: FileText }, guide] },
  { key: "vendeur", label: "Vendeur", role: "seller", icon: Store, activation: "role", tagline: "Vendre dans toute l'Afrique de l'Ouest",
    description: "Boutique, produits et stock, commandes à expédier, promotions, boosts, documents comptables.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "commandes", label: "Commandes", icon: Package }, { key: "produits", label: "Produits", icon: Layers }, { key: "promotions", label: "Promotions", icon: Megaphone }, { key: "boosts", label: "Boosts", icon: Zap }, { key: "documents", label: "Documents", icon: FolderDown }, guide] },
  { key: "livreur", label: "Livreur", role: "driver", icon: Bike, activation: "driver", tagline: "Livrer et gagner à chaque course",
    description: "Disponibilité, courses de votre zone, preuves de remise, gains et historique.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "livraisons", label: "Courses", icon: Truck }, { key: "historique", label: "Historique", icon: History }, { key: "carte", label: "Carte", icon: Map }, guide] },
  { key: "prestataire", label: "Prestataire", role: "provider", icon: Wrench, activation: "role", tagline: "Vendre vos services",
    description: "Services, formules Basique/Standard/Premium, devis, factures, rendez-vous, clients, profil pro.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "services", label: "Services", icon: Briefcase }, { key: "formules", label: "Formules", icon: Layers }, { key: "factures", label: "Factures", icon: Receipt },
      { key: "clients", label: "Clients", icon: Users }, { key: "etapes", label: "Suivi des prestations", icon: ListChecks }, { key: "promotions", label: "Promotions", icon: Megaphone }, { key: "profil", label: "Profil pro", icon: UserCog }, guide] },
  { key: "freelance", label: "Freelance", role: "freelance", icon: Laptop, activation: "role", tagline: "Trouver missions et emplois",
    description: "Offres qui vous correspondent, candidatures suivies, entretiens vidéo et enregistrés, profil et CV.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "offres", label: "Offres pour vous", icon: Search }, { key: "candidatures", label: "Candidatures", icon: FileText }, { key: "entretiens", label: "Entretiens", icon: CalendarClock }, { key: "profil", label: "Profil & CV", icon: UserCog }, guide] },
  { key: "recruteur", label: "Recruteur", role: "employer", icon: Building2, activation: "role", tagline: "Recruter les bons talents",
    description: "Offres détaillées, tri des CV par correspondance, pipeline, entretiens vidéo et enregistrés avec rapport, vivier.",
    tabs: [{ key: "vue", label: "Vue d'ensemble", icon: BarChart3 }, { key: "offres", label: "Offres", icon: Briefcase }, { key: "pipeline", label: "Candidats", icon: Users }, { key: "entretiens", label: "Entretiens", icon: CalendarClock },
      { key: "vivier", label: "Vivier", icon: Bookmark }, { key: "modeles", label: "Messages types", icon: MessageSquareText }, { key: "entreprise", label: "Entreprise", icon: Building }, guide] },
];

export const spaceOf = (k: string | null | undefined) => SPACES.find((s) => s.key === k);

/** Spaces the user can open, from their roles. The buyer space is always there. */
export const availableSpaces = (roles: string[]) => SPACES.filter((s) => s.activation === "always" || roles.includes(s.role));

/** Default space: the most "professional" role the user has. */
export const defaultSpace = (roles: string[]): SpaceKey => {
  for (const [role, space] of [["employer", "recruteur"], ["driver", "livreur"], ["provider", "prestataire"], ["freelance", "freelance"], ["seller", "vendeur"]] as const) if (roles.includes(role)) return space;
  return "acheteur";
};
