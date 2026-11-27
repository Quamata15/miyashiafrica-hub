import { useState, useEffect, forwardRef } from "react";
import { useT, LanguageSwitch } from "@/lib/i18n";
import { BrandMark } from "@/components/brand/BrandMark";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Search, Menu, X, ShoppingBag, Briefcase, Users, User, LogOut, 
  MessageSquare, LayoutDashboard, Bell, Home, Heart, BellRing, Truck, Wallet,
  Shield, HelpCircle, FileText, Phone, ChevronDown, Settings, Star, Rss, Store, Settings2, MapPin
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/cart/CartDrawer";
import ThemeToggle from "@/components/theme/ThemeToggle";
import GlobalSearch from "@/components/search/GlobalSearch";
import { useSpaces } from "@/hooks/useSpaces";
import { SPACES } from "@/components/spaces/registry";

const Header = forwardRef<HTMLElement>(function Header(_props, ref) {
  const { t } = useT();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [me, setMe] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const { user, signOut, loading } = useAuth();
  const sp = useSpaces();
  const isAdmin = sp.isAdmin;
  // Only the spaces the account holds, and only the tools those spaces use.
  const mySpaces = SPACES.filter((s) => s.activation !== "always" && sp.has(s.role));
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
    if (!user) { setMe(null); return; }
    const loadMe = () => supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => setMe(data));
    loadMe();
    // The profile page announces a new name or photo so the header follows at once.
    window.addEventListener("miyashi:profile-updated", loadMe);
    return () => window.removeEventListener("miyashi:profile-updated", loadMe);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`header-messages-${user.id}-${crypto.randomUUID()}`)
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

  // Public nav — always visible
  const publicLinks = [
    { label: "Accueil", href: "/", icon: Home },
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


  const go = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const totalBadge = unreadMessages + unreadNotifications;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-background/75 backdrop-blur-2xl border-b border-foreground/[0.08] shadow-soft"
          : "bg-background/30 backdrop-blur-md border-b border-transparent"
      )}
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <motion.div whileHover={{ scale: 1.06, rotate: -3 }} className="drop-shadow-[0_6px_18px_hsl(42_100%_55%/0.35)]">
              <BrandMark className="w-9 h-9 md:w-10 md:h-10" />
            </motion.div>
            <span className="font-display font-black tracking-tight text-xl text-foreground hidden sm:block group-hover:text-primary transition-colors">
              MIYASHI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {publicLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200",
                  isActive(link.href)
                    ? "bg-foreground/[0.08] text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{t(link.label)}</span>
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <GlobalSearch className="flex-1 min-w-0 mx-2 md:mx-4 md:max-w-sm" />

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle />
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Favoris" onClick={() => navigate("/favorites")}>
                  <Heart className="w-5 h-5" />
                </Button>

                <CartDrawer />

                <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications" onClick={() => navigate("/dashboard")}>
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-secondary text-secondary-foreground">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>

                <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Messages" onClick={() => navigate("/messages")}>
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-secondary text-secondary-foreground">
                      {unreadMessages}
                    </Badge>
                  )}
                </Button>

                {sp.can("publish") && (
                  <Button variant="default" size="sm" onClick={() => navigate("/create")} className="rounded-xl shadow-md bg-gradient-hero ml-1">
                    {t("+ Créer")}
                  </Button>
                )}

                {/* Profile dropdown — only when logged in */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all ml-1">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={me?.avatar_url ?? ""} alt="" className="object-cover" />
                        <AvatarFallback className="bg-gradient-hero text-primary-foreground font-bold text-sm">
                          {(me?.full_name || user.email || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60 p-2" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium truncate">{me?.full_name || t("Mon Compte")}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Main */}
                     <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> {t("Tableau de bord")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/feed")} className="cursor-pointer">
                        <Rss className="mr-2 h-4 w-4" /> {t("Fil d'actualité")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> {t("Mon Profil")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/wallet")} className="cursor-pointer">
                        <Wallet className="mr-2 h-4 w-4" /> {t("Mon Portefeuille")}
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer"><ShoppingBag className="mr-2 h-4 w-4" /> {t("Mes achats")}</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {[["/offers", "Offres et marchandage"], ["/savings", "Épargne"], ["/bookings", "Rendez-vous"], ["/quotes", "Devis"], ["/addresses", "Adresses"], ["/compare", "Comparateur"]].map(([href, label]) => (
                              <DropdownMenuItem key={href} onClick={() => navigate(href)} className="cursor-pointer">{label}</DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      {sp.can("sell") && (
                        <DropdownMenuItem onClick={() => navigate("/shop/manage")} className="cursor-pointer">
                          <Store className="mr-2 h-4 w-4" /> {t("Ma boutique")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                        <Settings2 className="mr-2 h-4 w-4" /> {t("Préférences")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    {/* Espaces pro */}
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Briefcase className="mr-2 h-4 w-4" /> {t("Mes Espaces")}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {mySpaces.map((s) => (
                              <DropdownMenuItem key={s.key} onClick={() => navigate(`/dashboard?espace=${s.key}`)} className="cursor-pointer">
                                <s.icon className="mr-2 h-4 w-4" /> {t(s.label)}
                              </DropdownMenuItem>
                            ))}
                            {sp.can("boost") && (
                              <DropdownMenuItem onClick={() => navigate("/boost")} className="cursor-pointer">
                                <Star className="mr-2 h-4 w-4" /> {t("Booster")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate("/pickup-partner")} className="cursor-pointer">
                              <MapPin className="mr-2 h-4 w-4" /> {t("Point relais")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate("/dashboard?gerer=1")} className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" /> {t("Gérer mes espaces")}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    {/* Communication */}
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => navigate("/messages")} className="cursor-pointer">
                        <MessageSquare className="mr-2 h-4 w-4" /> {t("Messages")}
                        {unreadMessages > 0 && <Badge className="ml-auto bg-secondary text-xs">{unreadMessages}</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/alerts")} className="cursor-pointer">
                        <BellRing className="mr-2 h-4 w-4" /> {t("Alertes recherche")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/disputes")} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" /> {t("Litiges")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {/* Admin — only for admin role */}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer text-primary">
                          <Shield className="mr-2 h-4 w-4" /> {t("Administration")}
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />

                    {/* Help */}
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <HelpCircle className="mr-2 h-4 w-4" /> {t("Aide")}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => navigate("/help")} className="cursor-pointer">
                              <HelpCircle className="mr-2 h-4 w-4" /> {t("Centre d'aide")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/faq")} className="cursor-pointer">
                              <FileText className="mr-2 h-4 w-4" /> {t("FAQ")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/contact")} className="cursor-pointer">
                              <Phone className="mr-2 h-4 w-4" /> {t("Contact")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/support")} className="cursor-pointer">
                              <MessageSquare className="mr-2 h-4 w-4" /> {t("Support")}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> {t("Se déconnecter")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-xl">
                  {t("Se connecter")}
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")} className="rounded-xl shadow-md bg-gradient-hero">
                  {t("S'inscrire")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-1 lg:hidden">
            {user && <CartDrawer />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              className="p-2 rounded-xl hover:bg-muted transition-colors relative"
            >
              {totalBadge > 0 && user && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-secondary-foreground text-[10px] flex items-center justify-center font-bold">
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
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
        </div>
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
            <div className="container py-4 space-y-1 max-h-[70vh] overflow-y-auto">
              {/* Navigation publique */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Explorer</p>
              {publicLinks.map((link, index) => (
                <motion.div key={link.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left",
                      isActive(link.href) ? "bg-gradient-hero text-primary-foreground" : "text-foreground hover:bg-foreground/[0.06]"
                    )}
                    onClick={() => go(link.href)}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{t(link.label)}</span>
                  </button>
                </motion.div>
              ))}

              {user ? (
                <>
                  {/* Mon compte */}
                  <div className="pt-3 border-t border-border mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Mon Compte</p>
                     <MobileMenuItem icon={LayoutDashboard} label="Tableau de bord" onClick={() => go("/dashboard")} badge={unreadNotifications} />
                    <MobileMenuItem icon={Rss} label="Fil d'actualité" onClick={() => go("/feed")} />
                    <MobileMenuItem icon={User} label="Mon Profil" onClick={() => go("/profile")} />
                    <MobileMenuItem icon={Wallet} label="Portefeuille" onClick={() => go("/wallet")} />
                    {sp.can("sell") && <MobileMenuItem icon={Store} label="Ma boutique" onClick={() => go("/shop/manage")} />}
                    <MobileMenuItem icon={ShoppingBag} label="Offres et marchandage" onClick={() => go("/offers")} />
                    <MobileMenuItem icon={Wallet} label="Épargne" onClick={() => go("/savings")} />
                    <MobileMenuItem icon={Briefcase} label="Rendez-vous et devis" onClick={() => go("/bookings")} />
                    <MobileMenuItem icon={Settings2} label="Préférences" onClick={() => go("/settings")} />
                    <MobileMenuItem icon={Heart} label="Favoris" onClick={() => go("/favorites")} />
                    <MobileMenuItem icon={MessageSquare} label="Messages" onClick={() => go("/messages")} badge={unreadMessages} />
                    <MobileMenuItem icon={BellRing} label="Alertes recherche" onClick={() => go("/alerts")} />
                    <MobileMenuItem icon={Shield} label="Litiges" onClick={() => go("/disputes")} />
                  </div>

                  {/* Espaces pro */}
                  <div className="pt-3 border-t border-border mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Mes espaces</p>
                    {mySpaces.map((s) => <MobileMenuItem key={s.key} icon={s.icon} label={`Espace ${s.label}`} onClick={() => go(`/dashboard?espace=${s.key}`)} />)}
                    {sp.can("boost") && <MobileMenuItem icon={Star} label="Booster" onClick={() => go("/boost")} />}
                    <MobileMenuItem icon={MapPin} label="Point relais" onClick={() => go("/pickup-partner")} />
                    <MobileMenuItem icon={Settings} label="Gérer mes espaces" onClick={() => go("/dashboard?gerer=1")} />
                    {sp.can("publish") && (
                      <Button variant="default" size="sm" onClick={() => go("/create")} className="w-full rounded-xl shadow-md bg-gradient-hero mt-2">
                        + Créer une annonce
                      </Button>
                    )}
                  </div>

                  {/* Admin */}
                  {isAdmin && (
                    <div className="pt-3 border-t border-border mt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Administration</p>
                      <MobileMenuItem icon={Shield} label="Panneau Admin" onClick={() => go("/admin")} className="text-primary" />
                    </div>
                  )}

                  {/* Aide */}
                  <div className="pt-3 border-t border-border mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Aide</p>
                    <MobileMenuItem icon={HelpCircle} label="Centre d'aide" onClick={() => go("/help")} />
                    <MobileMenuItem icon={FileText} label="FAQ" onClick={() => go("/faq")} />
                    <MobileMenuItem icon={Phone} label="Contact" onClick={() => go("/contact")} />
                  </div>

                  {/* Déconnexion */}
                  <div className="pt-3 border-t border-border mt-3">
                    <button
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left text-destructive hover:bg-destructive/10"
                      onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Se déconnecter</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-border space-y-2 mt-3">
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => go("/auth")}>
                    Se connecter
                  </Button>
                  <Button className="w-full rounded-xl bg-gradient-hero" onClick={() => go("/auth")}>
                    S'inscrire
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => go("/driver-registration")}>
                    <Truck className="mr-2 h-4 w-4" /> Devenir livreur
                  </Button>
                  <div className="pt-3 border-t border-border mt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-1 pb-2">Aide</p>
                    <MobileMenuItem icon={HelpCircle} label="Centre d'aide" onClick={() => go("/help")} />
                    <MobileMenuItem icon={FileText} label="FAQ" onClick={() => go("/faq")} />
                    <MobileMenuItem icon={Phone} label="Contact" onClick={() => go("/contact")} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
});

// Reusable mobile menu item
const MobileMenuItem = ({ icon: Icon, label, onClick, badge, className }: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  badge?: number;
  className?: string;
}) => <MobileMenuButton Icon={Icon} label={label} onClick={onClick} badge={badge} className={className} />;

const MobileMenuButton = ({ Icon, label, onClick, badge, className }: { Icon: React.ElementType; label: string; onClick: () => void; badge?: number; className?: string }) => {
  const { t } = useT();
  return (
  <button
    className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left hover:bg-muted", className)}
    onClick={onClick}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium flex-1">{t(label)}</span>
    {!!badge && badge > 0 && (
      <Badge className="bg-secondary text-secondary-foreground text-xs">{badge}</Badge>
    )}
  </button>
  );
};

export default Header;
