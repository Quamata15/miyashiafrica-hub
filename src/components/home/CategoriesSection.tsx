import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Smartphone, Shirt, Home, Car, Apple, Palette, Wrench, GraduationCap, ArrowUpRight, Sprout, Sparkles,
} from "lucide-react";

type Tile = {
  name: string;
  hint: string;
  icon: typeof Smartphone;
  href: string;
  span?: string;
  glow: string;
};

const TILES: Tile[] = [
  { name: "Électronique", hint: "Téléphones, ordinateurs, accessoires", icon: Smartphone, href: "/marketplace", span: "md:col-span-2 md:row-span-2", glow: "--neon-cyan" },
  { name: "Mode & Pagne", hint: "Wax, kente, prêt-à-porter", icon: Shirt, href: "/marketplace", glow: "--neon-magenta" },
  { name: "Vivres & Marché", hint: "Igname, riz, épices, frais", icon: Apple, href: "/marketplace", glow: "--neon-emerald" },
  { name: "Maison & Déco", hint: "Meubles, cuisine, déco", icon: Home, href: "/marketplace", glow: "--neon-gold" },
  { name: "Auto & Moto", hint: "Véhicules et pièces", icon: Car, href: "/marketplace", glow: "--neon-orange" },
  { name: "Agriculture", hint: "Semences, outils, élevage", icon: Sprout, href: "/marketplace", glow: "--neon-emerald" },
  { name: "Beauté", hint: "Soins, cosmétiques, karité", icon: Sparkles, href: "/marketplace", glow: "--neon-magenta" },
  { name: "Services pro", hint: "Plombier, électricien, mécano", icon: Wrench, href: "/services", span: "md:col-span-2", glow: "--neon-orange" },
  { name: "Art & Design", hint: "Créatifs et artisans", icon: Palette, href: "/services", span: "md:col-span-2", glow: "--neon-gold" },
  { name: "Formation", hint: "Cours et coaching", icon: GraduationCap, href: "/services", span: "md:col-span-2", glow: "--neon-cyan" },
];

const CategoriesSection = () => {
  return (
    <section className="relative py-20">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-3">Les allées du marché</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              Un marché, <span className="text-gradient-hero">mille étals</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Du sac d'igname au dernier smartphone, du coiffeur au développeur : chaque allée est à portée de doigt.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:auto-rows-[160px] gap-3 md:gap-4">
          {TILES.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 4) * 0.06 }}
              className={t.span ?? ""}
            >
              <Link
                to={t.href}
                className="group relative h-full w-full overflow-hidden rounded-2xl glass neon-border p-4 md:p-5 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity"
                  style={{ background: `hsl(var(${t.glow}))` }}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between">
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center border border-foreground/10"
                    style={{ background: `hsl(var(${t.glow}) / 0.15)` }}
                  >
                    <t.icon className="w-5 h-5" style={{ color: `hsl(var(${t.glow}))` }} />
                  </span>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-45 transition-all" />
                </div>
                <div className="relative">
                  <h3 className={`font-display font-bold ${t.span?.includes("row-span-2") ? "text-2xl md:text-3xl" : "text-sm md:text-base"}`}>
                    {t.name}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{t.hint}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
