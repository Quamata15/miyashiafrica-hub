import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, Briefcase, Users, Mail, Phone, MapPin, 
  Facebook, Twitter, Instagram, Linkedin, Youtube, ArrowUpRight,
  Truck, Wallet, Heart, LayoutDashboard, Shield, HelpCircle,
  FileText, MessageSquare, Star, Download
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const Footer = forwardRef<HTMLElement>(function Footer(_props, ref) {
  const { user } = useAuth();

  const exploreLinks = [
    { label: "Tous les produits", href: "/marketplace", icon: ShoppingBag },
    { label: "Services", href: "/services", icon: Briefcase },
    { label: "Freelance & Emploi", href: "/freelance", icon: Users },
    { label: "Devenir livreur", href: "/driver-registration", icon: Truck },
  ];

  const accountLinks = [
    { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mon Profil", href: "/profile" },
    { label: "Portefeuille", href: "/wallet", icon: Wallet },
    { label: "Mes Favoris", href: "/favorites", icon: Heart },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Booster", href: "/boost", icon: Star },
  ];

  const proLinks = [
    { label: "Créer une annonce", href: "/create" },
    { label: "Espace Prestataire", href: "/provider-space", icon: Briefcase },
    { label: "Espace Livreur", href: "/driver-dashboard", icon: Truck },
    { label: "Litiges", href: "/disputes", icon: Shield },
  ];

  const helpLinks = [
    { label: "Centre d'aide", href: "/help", icon: HelpCircle },
    { label: "FAQ", href: "/faq", icon: FileText },
    { label: "Nous contacter", href: "/contact", icon: Phone },
    { label: "Support", href: "/support", icon: MessageSquare },
    { label: "Conditions d'utilisation", href: "/terms", icon: FileText },
    { label: "Installer l'app", href: "/install", icon: Download },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="bg-gradient-dark text-white relative overflow-hidden border-t border-white/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Newsletter Section */}
      <div className="relative border-b border-white/10">
        <div className="container py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-display font-bold mb-2">
                Restez informé des dernières offres
              </h3>
              <p className="text-white/70">
                Inscrivez-vous à notre newsletter pour recevoir les meilleures opportunités.
              </p>
            </div>
            <div className="flex w-full lg:w-auto gap-3">
              <Input 
                placeholder="Votre adresse email" 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 w-full lg:w-80"
              />
              <Button variant="hero" className="shrink-0">
                S'abonner
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center shadow-lg">
                <span className="font-display font-bold text-2xl text-primary-foreground">M</span>
              </div>
              <span className="font-display font-bold text-2xl">MIYASHI</span>
            </Link>
            <p className="text-white/70 text-sm mb-6 max-w-xs leading-relaxed">
              La marketplace africaine qui connecte acheteurs, vendeurs, prestataires et freelances dans un écosystème dynamique et innovant.
            </p>
            <div className="space-y-3 text-sm">
              <motion.a 
                href="mailto:contact@miyashi.africa"
                className="flex items-center gap-3 text-white/70 hover:text-primary transition-colors group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span>contact@miyashi.africa</span>
              </motion.a>
              <motion.a 
                href="tel:+22897095685"
                className="flex items-center gap-3 text-white/70 hover:text-primary transition-colors group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+228 97 09 56 85</span>
              </motion.a>
              <motion.div 
                className="flex items-center gap-3 text-white/70 group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Lomé, Togo</span>
              </motion.div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 mt-6">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Explorer */}
          <FooterColumn title="Explorer" icon={ShoppingBag} links={exploreLinks} />

          {/* Mon Compte — only when logged in */}
          {user ? (
            <FooterColumn title="Mon Compte" icon={LayoutDashboard} links={accountLinks} />
          ) : (
            <div>
              <h4 className="font-display font-semibold mb-4 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-primary" />
                Commencer
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/auth" className="text-sm text-white/70 hover:text-primary transition-colors inline-flex items-center gap-1 group">
                    Se connecter
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-white/70 hover:text-primary transition-colors inline-flex items-center gap-1 group">
                    Créer un compte
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
                <li>
                  <Link to="/driver-registration" className="text-sm text-white/70 hover:text-primary transition-colors inline-flex items-center gap-1 group">
                    Devenir livreur
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Espaces Pro — only when logged in */}
          {user ? (
            <FooterColumn title="Espaces Pro" icon={Briefcase} links={proLinks} />
          ) : (
            <FooterColumn title="Aide & Support" icon={HelpCircle} links={helpLinks} />
          )}

          {/* Aide — always visible, but only if user is logged in (otherwise shown above) */}
          {user && (
            <FooterColumn title="Aide & Support" icon={HelpCircle} links={helpLinks} />
          )}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © 2026 MIYASHI by ASHIZAN Group. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms" className="text-sm text-white/50 hover:text-primary transition-colors">
              Conditions d'utilisation
            </Link>
            <Link to="/terms" className="text-sm text-white/50 hover:text-primary transition-colors">
              Politique de confidentialité
            </Link>
            <Link to="/terms" className="text-sm text-white/50 hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <Link to="/install" className="text-sm text-white/50 hover:text-primary transition-colors flex items-center gap-1">
              <Download className="w-3 h-3" /> Installer l'app
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

const FooterColumn = ({ title, icon: Icon, links }: {
  title: string;
  icon: React.ElementType;
  links: { label: string; href: string; icon?: React.ElementType }[];
}) => (
  <div>
    <h4 className="font-display font-semibold mb-4 flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h4>
    <ul className="space-y-3">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            to={link.href}
            className="text-sm text-white/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
          >
            {link.label}
            <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default Footer;
