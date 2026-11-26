import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Search, ShoppingBag, Wrench, Users, Truck, ShieldCheck, Smartphone,
  Shirt, Wheat, Scissors, Code2, Car, Sparkles, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const ORBIT = [
  { icon: Smartphone, label: "Smartphones", angle: 0 },
  { icon: Shirt, label: "Pagne wax", angle: 60 },
  { icon: Wheat, label: "Igname & céréales", angle: 120 },
  { icon: Scissors, label: "Coiffure", angle: 180 },
  { icon: Code2, label: "Développeurs", angle: 240 },
  { icon: Car, label: "Pièces auto", angle: 300 },
];

const TICKER = [
  "Smartphone Tecno vendu à Lomé",
  "Mission design acceptée à Abidjan",
  "Pagne wax livré à Cotonou en 2 h",
  "Plombier réservé à Dakar",
  "Sac d'igname expédié à Kara",
  "Freelance payé via séquestre",
  "Coiffure à domicile à Ouagadougou",
  "Moto livrée à Bamako",
];

const PILLARS = [
  { href: "/marketplace", icon: ShoppingBag, title: "Marketplace", desc: "Tout s'achète : mode, tech, vivres, maison", tone: "from-[hsl(var(--neon-gold))] to-[hsl(var(--neon-orange))]" },
  { href: "/services", icon: Wrench, title: "Services", desc: "Artisans et pros près de chez vous", tone: "from-[hsl(var(--neon-orange))] to-[hsl(var(--neon-magenta))]" },
  { href: "/freelance", icon: Users, title: "Freelance & Jobs", desc: "Talents digitaux, missions payées", tone: "from-[hsl(var(--neon-emerald))] to-[hsl(var(--neon-cyan))]" },
  { href: "/driver-registration", icon: Truck, title: "Livraison", desc: "Devenez livreur, 550 F/km", tone: "from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-gold))]" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
  };

  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-16">
      {/* Background: night glow, grid floor, kente weave */}
      <div className="absolute inset-0 bg-gradient-warm" />
      <div className="absolute inset-0 bg-grid mask-radial opacity-80" />
      <div className="absolute -top-40 right-[-10%] w-[620px] h-[620px] rounded-full bg-[hsl(var(--neon-gold)/0.18)] blur-[120px]" />
      <div className="absolute top-40 left-[-15%] w-[520px] h-[520px] rounded-full bg-[hsl(var(--neon-magenta)/0.14)] blur-[120px]" />

      <div className="container relative">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          {/* Copy + search */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs md:text-sm font-medium mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Le marché africain nouvelle génération
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-display font-black leading-[0.95] tracking-tight text-[2.6rem] sm:text-6xl xl:text-7xl mb-6"
            >
              Tout s'achète.
              <br />
              <span className="text-gradient-hero animate-shimmer">Tout se vend.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8"
            >
              Produits, services, talents et livraison dans un seul marché. Paiement mobile money,
              argent bloqué en séquestre jusqu'à la réception.
            </motion.p>

            <motion.form
              onSubmit={onSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="neon-border glass rounded-2xl p-2 flex items-center gap-2 max-w-xl mx-auto lg:mx-0 shadow-elevated"
              role="search"
            >
              <Search className="w-5 h-5 ml-3 text-muted-foreground shrink-0" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Que cherchez-vous ? Téléphone, pagne, plombier…"
                aria-label="Rechercher sur MIYASHI"
                className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-muted-foreground/80 py-3"
              />
              <Button type="submit" className="bg-gradient-hero text-primary-foreground rounded-xl h-12 px-5 font-semibold shadow-glow">
                <span className="hidden sm:inline">Chercher</span>
                <ArrowRight className="w-5 h-5 sm:ml-1" />
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6"
            >
              <Link to="/create?type=product">
                <Button variant="outline" className="rounded-xl h-11 glass border-0">
                  <Zap className="w-4 h-4 mr-2 text-primary" /> Vendre maintenant
                </Button>
              </Link>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-accent" /> Paiement sécurisé · TMoney · Flooz · MTN · Wave
              </span>
            </motion.div>
          </div>

          {/* Orbiting market */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative mx-auto w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] [--orbit-r:128px] sm:[--orbit-r:196px]"
            aria-hidden
          >
            <div className="absolute inset-0 rounded-full border border-foreground/10" />
            <div className="absolute inset-[12%] rounded-full border border-dashed border-primary/30 animate-spin-slow" />
            <div className="absolute inset-[26%] rounded-full border border-accent/25 animate-spin-reverse" />
            <div className="absolute inset-[36%] rounded-full bg-gradient-hero blur-2xl opacity-60" />
            <div className="absolute inset-[34%] rounded-full glass neon-border flex flex-col items-center justify-center text-center">
              <span className="font-display font-black text-2xl sm:text-3xl text-gradient-hero">MIYASHI</span>
              <span className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted-foreground mt-1">aller au marché</span>
            </div>
            {ORBIT.map(({ icon: Icon, label, angle }, i) => (
              <div
                key={label}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `rotate(${angle}deg) translate(var(--orbit-r)) rotate(-${angle}deg)` }}
              >
                <motion.div
                  className="-translate-x-1/2 -translate-y-1/2 glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-card whitespace-nowrap animate-float"
                  style={{ animationDelay: `${i * 0.7}s` }}
                >
                  <span className="w-7 h-7 rounded-lg bg-gradient-hero flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </span>
                  <span className="text-xs font-medium hidden sm:inline">{label}</span>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Live ticker */}
        <div className="relative mt-14 overflow-hidden rounded-2xl glass py-3" aria-label="Activité récente">
          <div className="flex w-max animate-marquee gap-10 px-6">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Four pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <Link
                to={p.href}
                className="group neon-border glass rounded-2xl p-4 md:p-5 h-full flex flex-col transition-transform duration-300 hover:-translate-y-1.5"
              >
                <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.tone} flex items-center justify-center mb-4 shadow-glow`}>
                  <p.icon className="w-5 h-5 text-[hsl(250_40%_6%)]" />
                </span>
                <h2 className="font-display text-base font-bold mb-1">{p.title}</h2>
                <p className="text-xs md:text-sm text-muted-foreground flex-1">{p.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                  Entrer <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
