import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Search, ShoppingBag, Wrench, Users, Truck, ShieldCheck, Zap, Lock, Bike, Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { PHOTOS, photoUrl, photoSrcSet } from "@/lib/photos";
import { ImageSearchButton, VoiceSearchButton } from "@/components/search/SmartSearch";
import { supabase } from "@/integrations/supabase/client";

const TICKER = [
  "Pagne wax · Lomé", "Smartphone · Abidjan", "Igname · Kara", "Plombier · Dakar", "Logo & branding · Cotonou",
  "Coiffure à domicile · Ouagadougou", "Pièces moto · Bamako", "Karité bio · Niamey", "Cours de maths · Conakry",
];

const QUICK = ["Téléphone", "Pagne wax", "Igname", "Plombier", "Graphiste"];

const PILLARS = [
  { href: "/marketplace", icon: ShoppingBag, title: "Marketplace", desc: "Mode, tech, vivres, maison" },
  { href: "/services", icon: Wrench, title: "Services", desc: "Artisans et pros près de vous" },
  { href: "/freelance", icon: Users, title: "Freelance & Jobs", desc: "Talents et missions payées" },
  { href: "/driver-registration", icon: Truck, title: "Livraison", desc: "Devenez livreur, 550 F/km" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // Editable from Admin → Contenu (#47); these defaults show until it loads.
  const [hero, setHero] = useState({ eyebrow: "Le grand marché d'Afrique de l'Ouest, dans votre poche", title_1: "Tout s'achète.", title_2: "Tout se vend.",
    subtitle: "Produits, services, talents et livraison au même endroit. Vous payez en mobile money, l'argent reste bloqué jusqu'à ce que vous ayez reçu votre commande.", quick_searches: QUICK });
  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "home_hero").maybeSingle().then(({ data }) => data?.value && setHero((h) => ({ ...h, ...(data.value as object) })));
  }, []);

  const go = (q: string) => navigate(q.trim() ? `/marketplace?q=${encodeURIComponent(q.trim())}` : "/marketplace");

  return (
    <section className="relative overflow-hidden pt-28 md:pt-32 pb-14">
      <div className="absolute inset-0 bg-gradient-warm" />
      <div className="absolute inset-0 bg-grid mask-radial opacity-70" />
      <div className="absolute -top-48 right-[-10%] w-[640px] h-[640px] rounded-full bg-primary/15 blur-[130px]" />

      <div className="container relative">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
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
              {hero.eyebrow}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-display font-black leading-[0.95] tracking-tight text-[2.6rem] sm:text-6xl xl:text-7xl mb-6"
            >
              {hero.title_1}
              <br />
              <span className="text-primary">{hero.title_2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8"
            >
              {hero.subtitle}
            </motion.p>

            <motion.form
              onSubmit={(e) => { e.preventDefault(); go(query); }}
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
                placeholder="Que cherchez-vous aujourd'hui ?"
                aria-label="Rechercher sur MIYASHI"
                className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-muted-foreground/80 py-3"
              />
              <VoiceSearchButton onResult={(t) => { setQuery(t); go(t); }} />
              <ImageSearchButton onResult={(t) => go(t)} />
              <Button type="submit" className="rounded-xl h-12 px-5 font-semibold">
                <span className="hidden sm:inline">Chercher</span>
                <ArrowRight className="w-5 h-5 sm:ml-1" />
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4"
            >
              {(hero.quick_searches ?? QUICK).map((q: string) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => go(q)}
                  className="px-3 py-1.5 rounded-full text-xs md:text-sm border border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-7 text-sm text-muted-foreground"
            >
              <Link to="/create?type=product" className="inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
                <Zap className="w-4 h-4 text-primary" /> Ouvrir ma boutique gratuitement
              </Link>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> TMoney · Flooz · MTN · Wave · Carte
              </span>
            </motion.div>
          </div>

          {/* Photo collage — real market life */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="relative mx-auto w-full max-w-[520px] aspect-[5/6]"
          >
            <div className="absolute inset-y-0 left-0 w-[72%] overflow-hidden rounded-[2rem] border border-foreground/10 shadow-elevated">
              <img
                src={photoUrl(PHOTOS.tomatoSeller, 720, 900)}
                srcSet={photoSrcSet(PHOTOS.tomatoSeller, [480, 720, 960], 1.25)}
                sizes="(min-width: 1024px) 380px, 70vw"
                alt={PHOTOS.tomatoSeller.alt}
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
            </div>
            <div className="absolute right-0 top-[12%] w-[46%] aspect-[4/5] overflow-hidden rounded-3xl border-4 border-background shadow-elevated">
              <img
                src={photoUrl(PHOTOS.phoneShopper, 420, 525)}
                srcSet={photoSrcSet(PHOTOS.phoneShopper, [300, 420, 600], 1.25)}
                sizes="(min-width: 1024px) 240px, 45vw"
                alt={PHOTOS.phoneShopper.alt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Floating status cards (illustrative) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="absolute right-[2%] bottom-[30%] glass rounded-2xl p-3 pr-4 flex items-center gap-3 shadow-elevated animate-float"
              aria-hidden
            >
              <span className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-accent" />
              </span>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Séquestre</p>
                <p className="text-sm font-semibold">Paiement protégé</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="absolute left-[4%] bottom-[6%] glass rounded-2xl p-3 pr-4 flex items-center gap-3 shadow-elevated animate-float"
              style={{ animationDelay: "1.5s" }}
              aria-hidden
            >
              <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Bike className="w-4 h-4 text-primary" />
              </span>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Livraison</p>
                <p className="text-sm font-semibold">Suivie en direct</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="absolute left-[46%] top-[2%] glass rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold shadow-card"
              aria-hidden
            >
              <Star className="w-3.5 h-3.5 text-primary fill-primary" /> Vendeurs vérifiés
            </motion.div>
          </motion.div>
        </div>

        {/* Ticker: what you can find */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-foreground/[0.08] bg-foreground/[0.02] py-3" aria-label="Ce qu'on trouve sur MIYASHI">
          <div className="flex w-max animate-marquee gap-8 px-6">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Four pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <Link
                to={p.href}
                className="group glass rounded-2xl p-4 md:p-5 h-full flex flex-col items-start md:flex-row md:items-center gap-3 md:gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <p.icon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm md:text-base font-bold">{p.title}</h2>
                  <p className="text-xs md:text-sm text-muted-foreground md:truncate">{p.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden md:block" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
