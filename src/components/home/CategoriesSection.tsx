import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Smartphone, Shirt, Home, Car, Apple, Palette, Wrench, GraduationCap, ArrowUpRight, Sprout, Sparkles,
} from "lucide-react";
import { PHOTOS, photoUrl, type Photo } from "@/lib/photos";

type Tile = {
  name: string;
  hint: string;
  icon: typeof Smartphone;
  href: string;
  span?: string;
  photo?: Photo;
};

const TILES: Tile[] = [
  { name: "Mode & Pagne", hint: "Wax, kente, prêt-à-porter", icon: Shirt, href: "/marketplace?q=pagne", span: "md:col-span-2 md:row-span-2", photo: PHOTOS.waxFabrics },
  { name: "Vivres & Marché", hint: "Igname, riz, épices, frais", icon: Apple, href: "/marketplace?q=vivres", span: "md:col-span-2", photo: PHOTOS.grains },
  { name: "Électronique", hint: "Téléphones, ordinateurs", icon: Smartphone, href: "/marketplace?q=téléphone" },
  { name: "Maison & Déco", hint: "Meubles, cuisine, déco", icon: Home, href: "/marketplace?q=maison" },
  { name: "Auto & Moto", hint: "Véhicules et pièces détachées", icon: Car, href: "/marketplace?q=moto", span: "md:col-span-2", photo: PHOTOS.motoGoods },
  { name: "Agriculture", hint: "Semences, outils, élevage", icon: Sprout, href: "/marketplace?q=agriculture" },
  { name: "Beauté", hint: "Soins, karité, cosmétiques", icon: Sparkles, href: "/marketplace?q=beauté" },
  { name: "Services pro", hint: "Plombier, électricien, mécano", icon: Wrench, href: "/services" },
  { name: "Art & Design", hint: "Créatifs et artisans", icon: Palette, href: "/services" },
  { name: "Formation", hint: "Cours et coaching", icon: GraduationCap, href: "/services", span: "md:col-span-2" },
];

const CategoriesSection = () => {
  return (
    <section className="relative py-20">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-3">Les allées du marché</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              Un marché, <span className="text-primary">mille étals</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Du sac d'igname au dernier smartphone, du coiffeur au développeur : chaque allée est à portée de doigt.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[170px] gap-3 md:gap-4">
          {TILES.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 4) * 0.06 }}
              className={`${t.span ?? ""} ${t.photo || t.name === "Formation" ? "col-span-2" : ""}`}
            >
              <Link
                to={t.href}
                className="group relative h-full w-full overflow-hidden rounded-2xl border border-foreground/[0.08] bg-card/70 p-4 md:p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                {t.photo && (
                  <>
                    <img
                      src={photoUrl(t.photo, t.span?.includes("row-span") ? 900 : 700, t.span?.includes("row-span") ? 900 : 360)}
                      alt={t.photo.alt}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_25%_5%/0.9)] via-[hsl(240_25%_5%/0.35)] to-transparent" />
                  </>
                )}
                <div className="relative flex items-start justify-between">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.photo ? "bg-black/40 backdrop-blur border border-white/15 text-white" : "bg-primary/10 border border-primary/20 text-primary"}`}>
                    <t.icon className="w-5 h-5" />
                  </span>
                  <ArrowUpRight className={`w-5 h-5 transition-all group-hover:rotate-45 ${t.photo ? "text-white/80" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <div className="relative">
                  <h3 className={`font-display font-bold ${t.photo ? "text-white" : ""} ${t.span?.includes("row-span") ? "text-2xl md:text-3xl" : "text-sm md:text-base"}`}>
                    {t.name}
                  </h3>
                  <p className={`text-xs md:text-sm mt-1 line-clamp-2 ${t.photo ? "text-white/75" : "text-muted-foreground"}`}>{t.hint}</p>
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
