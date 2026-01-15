import { ShoppingBag, Briefcase, Users, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    marketplace: [
      { label: "Tous les produits", href: "#" },
      { label: "Catégories", href: "#" },
      { label: "Promotions", href: "#" },
      { label: "Nouveautés", href: "#" },
    ],
    services: [
      { label: "Trouver un service", href: "#" },
      { label: "Devenir prestataire", href: "#" },
      { label: "Comment ça marche", href: "#" },
    ],
    freelance: [
      { label: "Offres d'emploi", href: "#" },
      { label: "Profils freelances", href: "#" },
      { label: "Publier une mission", href: "#" },
    ],
    support: [
      { label: "Centre d'aide", href: "#" },
      { label: "Nous contacter", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Conditions d'utilisation", href: "#" },
    ],
  };

  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                <span className="font-display font-bold text-xl text-primary-foreground">M</span>
              </div>
              <span className="font-display font-bold text-xl">MIYASHI</span>
            </div>
            <p className="text-background/70 text-sm mb-6 max-w-xs">
              La marketplace africaine qui connecte acheteurs, vendeurs, prestataires et freelances.
            </p>
            <div className="space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>contact@miyashi.africa</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+225 00 00 00 00</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Abidjan, Côte d'Ivoire</span>
              </div>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h4 className="font-display font-semibold">Marketplace</h4>
            </div>
            <ul className="space-y-2">
              {footerLinks.marketplace.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-primary" />
              <h4 className="font-display font-semibold">Services</h4>
            </div>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Freelance */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h4 className="font-display font-semibold">Freelance</h4>
            </div>
            <ul className="space-y-2">
              {footerLinks.freelance.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2025 MIYASHI by ASHIZAN Group. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-background/50 hover:text-primary transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="text-sm text-background/50 hover:text-primary transition-colors">
              Mentions légales
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
