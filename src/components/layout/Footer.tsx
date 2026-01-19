import { Link } from "react-router-dom";
import { 
  ShoppingBag, Briefcase, Users, Mail, Phone, MapPin, 
  Facebook, Twitter, Instagram, Linkedin, Youtube, ArrowUpRight 
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Footer = () => {
  const footerLinks = {
    marketplace: [
      { label: "Tous les produits", href: "/marketplace" },
      { label: "Catégories", href: "/marketplace" },
      { label: "Promotions", href: "/marketplace" },
      { label: "Nouveautés", href: "/marketplace" },
    ],
    services: [
      { label: "Trouver un service", href: "/services" },
      { label: "Devenir prestataire", href: "/create" },
      { label: "Comment ça marche", href: "/" },
    ],
    freelance: [
      { label: "Offres d'emploi", href: "/freelance" },
      { label: "Profils freelances", href: "/freelance" },
      { label: "Publier une mission", href: "/create" },
    ],
    support: [
      { label: "Centre d'aide", href: "#" },
      { label: "Nous contacter", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Conditions d'utilisation", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="bg-foreground text-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Newsletter Section */}
      <div className="relative border-b border-background/10">
        <div className="container py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-display font-bold mb-2">
                Restez informé des dernières offres
              </h3>
              <p className="text-background/70">
                Inscrivez-vous à notre newsletter pour recevoir les meilleures opportunités.
              </p>
            </div>
            <div className="flex w-full lg:w-auto gap-3">
              <Input 
                placeholder="Votre adresse email" 
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50 w-full lg:w-80"
              />
              <Button variant="hero" className="shrink-0">
                S'abonner
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center shadow-lg">
                <span className="font-display font-bold text-2xl text-primary-foreground">M</span>
              </div>
              <span className="font-display font-bold text-2xl">MIYASHI</span>
            </Link>
            <p className="text-background/70 text-sm mb-6 max-w-xs leading-relaxed">
              La marketplace africaine qui connecte acheteurs, vendeurs, prestataires et freelances dans un écosystème dynamique et innovant.
            </p>
            <div className="space-y-3 text-sm">
              <motion.a 
                href="mailto:contact@miyashi.africa"
                className="flex items-center gap-3 text-background/70 hover:text-primary transition-colors group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span>contact@miyashi.africa</span>
              </motion.a>
              <motion.a 
                href="tel:+22897095685"
                className="flex items-center gap-3 text-background/70 hover:text-primary transition-colors group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+228 97 09 56 85</span>
              </motion.a>
              <motion.div 
                className="flex items-center gap-3 text-background/70 group"
                whileHover={{ x: 5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center">
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
                  className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h4 className="font-display font-semibold">Marketplace</h4>
            </div>
            <ul className="space-y-3">
              {footerLinks.marketplace.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
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
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
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
            <ul className="space-y-3">
              {footerLinks.freelance.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2026 MIYASHI by ASHIZAN Group. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-sm text-background/50 hover:text-primary transition-colors">
              Politique de confidentialité
            </Link>
            <Link to="#" className="text-sm text-background/50 hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <Link to="#" className="text-sm text-background/50 hover:text-primary transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
