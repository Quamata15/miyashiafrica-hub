import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Search, Menu, X, ShoppingBag, Briefcase, Users, User, LogOut, 
  MessageSquare, LayoutDashboard, Bell, Home, Heart, BellRing, Truck, Wallet, Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/cart/CartDrawer";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user, signOut } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user) fetchUnreadMessages();
  }, [user]);

  // Real-time message count
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`header-messages-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnreadMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchUnreadMessages = async () => {
    if (!user) return;
    const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
    setUnreadMessages(count || 0);
  };

  const navLinks = [
    { label: "Accueil", href: user ? "/dashboard" : "/", icon: Home },
    { label: "Produits", href: "/marketplace", icon: ShoppingBag },
    { label: "Services", href: "/services", icon: Briefcase },
    { label: "Freelance", href: "/freelance", icon: Users },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/" || href === "/dashboard") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-card/95 backdrop-blur-xl border-b border-border shadow-soft" 
          : "bg-card/80 backdrop-blur-sm"
      )}
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-lg"
            >
              <span className="font-display font-bold text-xl text-primary-foreground">M</span>
            </motion.div>
            <span className="font-display font-bold text-xl text-foreground hidden sm:block group-hover:text-primary transition-colors">
              MIYASHI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200",
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border focus:border-primary focus:bg-card focus:shadow-md outline-none transition-all duration-300 text-sm"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/favorites")}>
                  <Heart className="w-5 h-5" />
                </Button>

                <CartDrawer />

                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/alerts")}>
                  <BellRing className="w-5 h-5" />
                </Button>

                <Button variant="ghost" size="icon" className="relative rounded-xl" onClick={() => navigate("/dashboard")}>
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-secondary text-secondary-foreground">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>

                <Button variant="ghost" size="icon" className="relative rounded-xl" onClick={() => navigate("/messages")}>
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-secondary text-secondary-foreground">
                      {unreadMessages}
                    </Badge>
                  )}
                </Button>

                <Button variant="default" size="sm" onClick={() => navigate("/create")} className="rounded-xl shadow-md bg-gradient-hero ml-1">
                  + Créer
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all ml-1">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-hero text-primary-foreground font-bold text-sm">
                          {user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-2" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">Mon Compte</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> Mon Profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/driver-dashboard")} className="cursor-pointer">
                        <Truck className="mr-2 h-4 w-4" /> Espace Livreur
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/provider-space")} className="cursor-pointer">
                        <Briefcase className="mr-2 h-4 w-4" /> Espace Prestataire
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/wallet")} className="cursor-pointer">
                        <Wallet className="mr-2 h-4 w-4" /> Mon Portefeuille
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/messages")} className="cursor-pointer">
                        <MessageSquare className="mr-2 h-4 w-4" /> Messages
                        {unreadMessages > 0 && <Badge className="ml-auto bg-secondary text-xs">{unreadMessages}</Badge>}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-xl">
                  Se connecter
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")} className="rounded-xl shadow-md bg-gradient-hero">
                  S'inscrire
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border focus:border-primary focus:bg-card outline-none transition-all duration-300 text-sm"
            />
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-border overflow-hidden"
          >
            <div className="container py-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div key={link.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Link
                    to={link.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      isActive(link.href) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </motion.div>
              ))}
              
              <div className="pt-4 border-t border-border space-y-2">
                {user ? (
                  <>
                    <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => { navigate("/dashboard"); setIsMenuOpen(false); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => { navigate("/driver-dashboard"); setIsMenuOpen(false); }}>
                      <Truck className="mr-2 h-4 w-4" /> Espace Livreur
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => { navigate("/profile"); setIsMenuOpen(false); }}>
                      <User className="mr-2 h-4 w-4" /> Mon Profil
                    </Button>
                    <Button variant="ghost" className="w-full rounded-xl justify-start text-destructive" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                      <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => { navigate("/auth"); setIsMenuOpen(false); }}>
                      Se connecter
                    </Button>
                    <Button className="w-full rounded-xl bg-gradient-hero" onClick={() => { navigate("/auth"); setIsMenuOpen(false); }}>
                      S'inscrire
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => { navigate("/driver-registration"); setIsMenuOpen(false); }}>
                      <Truck className="mr-2 h-4 w-4" /> Devenir livreur
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
