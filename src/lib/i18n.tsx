// Site language (#20). French is the source language; each French string is the key of its
// English translation, so untranslated text simply stays in French.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

const EN: Record<string, string> = {
  // navigation
  "Accueil": "Home", "Produits": "Products", "Services": "Services", "Freelance": "Freelance",
  "Rechercher produits, services…": "Search products, services…", "Se connecter": "Sign in", "S'inscrire": "Sign up", "+ Créer": "+ Create",
  "Mon Compte": "My account", "Tableau de bord": "Dashboard", "Fil d'actualité": "Feed", "Mon Profil": "My profile", "Mon Portefeuille": "My wallet",
  "Mes achats": "My purchases", "Ma boutique": "My shop", "Préférences": "Settings", "Mes Espaces": "My spaces", "Prestataire": "Provider",
  "Livreur": "Driver", "Booster": "Boost", "Point relais": "Pickup point", "Messages": "Messages", "Alertes recherche": "Search alerts",
  "Litiges": "Disputes", "Administration": "Admin", "Aide": "Help", "Centre d'aide": "Help center", "FAQ": "FAQ", "Contact": "Contact",
  "Support": "Support", "Se déconnecter": "Sign out", "Offres et marchandage": "Offers & haggling", "Épargne": "Savings", "Rendez-vous": "Appointments",
  "Devis": "Quotes", "Adresses": "Addresses", "Comparateur": "Compare",
  // footer
  "Explorer": "Explore", "Espaces Pro": "Pro spaces", "Aide & Support": "Help & support", "Tous les produits": "All products",
  "Freelance & Emploi": "Freelance & jobs", "Devenir livreur": "Become a driver", "Devenir point relais": "Become a pickup point",
  "Portefeuille": "Wallet", "Mes Favoris": "Favorites", "Créer une annonce": "Post a listing", "Espace Prestataire": "Provider space",
  "Espace Livreur": "Driver space", "Nous contacter": "Contact us", "Conditions d'utilisation": "Terms of use", "Installer l'app": "Install the app",
  "Politique de confidentialité": "Privacy policy", "Mentions légales": "Legal notice", "État du service": "Service status",
  "Préférences et cookies": "Settings & cookies", "Restez informé des dernières offres": "Get the latest deals",
  "Inscrivez-vous à notre newsletter pour recevoir les meilleures opportunités.": "Subscribe to our newsletter for the best opportunities.",
  "S'abonner": "Subscribe", "Votre adresse email": "Your email address",
  // home
  "Le grand marché d'Afrique de l'Ouest, dans votre poche": "West Africa's great market, in your pocket",
  "Tout s'achète.": "Buy anything.", "Tout se vend.": "Sell anything.",
  "Produits, services, talents et livraison au même endroit. Vous payez en mobile money, l'argent reste bloqué jusqu'à ce que vous ayez reçu votre commande.":
    "Products, services, talent and delivery in one place. Pay with mobile money; the money stays locked until you receive your order.",
  "Que cherchez-vous aujourd'hui ?": "What are you looking for today?", "Chercher": "Search", "Ouvrir ma boutique gratuitement": "Open my shop for free",
  "Les allées du marché": "Market aisles", "Un marché,": "One market,", "mille étals": "a thousand stalls",
  "Du sac d'igname au dernier smartphone, du coiffeur au développeur : chaque allée est à portée de doigt.": "From a sack of yams to the latest smartphone, from hairdressers to developers: every aisle at your fingertips.",
  "Zéro arnaque": "Zero scams", "Acheter devient": "Buying becomes", "sans risque": "risk-free",
  "Chaque paiement transite par le séquestre MIYASHI. L'argent ne bouge qu'une fois la commande reçue.": "Every payment goes through MIYASHI escrow. Money only moves once the order is received.",
  "Trouvez": "Find", "Payez": "Pay", "Séquestre": "Escrow", "Recevez": "Receive",
  "Cherchez un produit, un service ou un talent près de chez vous.": "Look for a product, a service or a talent near you.",
  "Mobile money ou carte via FedaPay, en quelques secondes.": "Mobile money or card via FedaPay, in seconds.",
  "Votre argent est bloqué chez MIYASHI, pas chez le vendeur.": "Your money is held by MIYASHI, not by the seller.",
  "Vous confirmez la réception : le vendeur est payé.": "You confirm receipt: the seller gets paid.",
  "Votre place au": "Your place at the", "marché": "market", "vous attend": "is waiting",
  "Populaires en ce moment": "Popular right now", "Vus récemment": "Recently viewed", "Recommandé pour vous": "Recommended for you",
  "Comme sous l'arbre à palabres : des règles claires, une parole tenue.": "Like under the palaver tree: clear rules, promises kept.",
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (fr: string) => string };
const I18n = createContext<Ctx>({ lang: "fr", setLang: () => undefined, t: (s) => s });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { const v = localStorage.getItem("miyashi_ui_lang"); if (v === "en" || v === "fr") return v; } catch { /* ignore */ }
    return "fr";   // French by default; English only when chosen
  });
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem("miyashi_ui_lang", l); } catch { /* ignore */ } }, []);
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (fr: string) => (lang === "en" ? EN[fr] ?? fr : fr) }), [lang, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useT = () => useContext(I18n);

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useT();
  return (
    <button type="button" onClick={() => setLang(lang === "fr" ? "en" : "fr")} className={`h-9 px-2 rounded-xl text-xs font-semibold border border-foreground/15 hover:border-primary/50 ${className}`}
      aria-label={lang === "fr" ? "Switch to English" : "Passer en français"} title={lang === "fr" ? "English" : "Français"}>
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );
}
