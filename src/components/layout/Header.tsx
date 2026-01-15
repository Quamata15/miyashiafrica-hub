import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu, X, ShoppingBag, Briefcase, Users } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { label: "Produits", href: "#produits", icon: ShoppingBag },
    { label: "Services", href: "#services", icon: Briefcase },
    { label: "Freelance & Jobs", href: "#freelance", icon: Users },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <span className="font-display font-bold text-xl text-primary-foreground">M</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground hidden sm:block">
              MIYASHI
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              >
                <link.icon className="w-4 h-4" />
                <span className="font-medium">{link.label}</span>
              </a>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher produits, services, freelances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border border-transparent focus:border-primary focus:bg-card focus:shadow-soft outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="default">
              Se connecter
            </Button>
            <Button variant="hero" size="default">
              S'inscrire
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border border-transparent focus:border-primary focus:bg-card outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-card border-t border-border animate-fade-in">
          <div className="container py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <link.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{link.label}</span>
              </a>
            ))}
            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="outline" className="w-full">
                Se connecter
              </Button>
              <Button variant="hero" className="w-full">
                S'inscrire
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
