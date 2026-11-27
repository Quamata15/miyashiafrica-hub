import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { Link } from "react-router-dom";
import {
  Smartphone, Shirt, Home, Car, Apple, Palette, Wrench, GraduationCap, ArrowUpRight, Sprout, Sparkles, Pause,
} from "lucide-react";
import { photoUrl } from "@/lib/photos";
import { AISLE_PHOTOS, type AisleKey } from "@/lib/aislePhotos";
import AisleSlideshow from "./AisleSlideshow";

type Tile = {
  key: AisleKey;
  name: string;
  hint: string;
  icon: typeof Smartphone;
  href: string;
  span?: string;
};

const TILES: Tile[] = [
  { key: "mode", name: "Mode & Pagne", hint: "Wax, kente, prêt-à-porter", icon: Shirt, href: "/marketplace?q=pagne", span: "md:col-span-2 md:row-span-2" },
  { key: "vivres", name: "Vivres & Marché", hint: "Igname, riz, épices, frais", icon: Apple, href: "/marketplace?q=vivres", span: "md:col-span-2" },
  { key: "electro", name: "Électronique", hint: "Téléphones, ordinateurs", icon: Smartphone, href: "/marketplace?q=téléphone" },
  { key: "maison", name: "Maison & Déco", hint: "Vannerie, poterie, déco", icon: Home, href: "/marketplace?q=maison" },
  { key: "auto", name: "Auto & Moto", hint: "Motos, tricycles, pièces", icon: Car, href: "/marketplace?q=moto", span: "md:col-span-2" },
  { key: "agri", name: "Agriculture", hint: "Semences, outils, récoltes", icon: Sprout, href: "/marketplace?q=agriculture" },
  { key: "beaute", name: "Beauté", hint: "Soins, karité, coiffure", icon: Sparkles, href: "/marketplace?q=beauté" },
  { key: "services", name: "Services pro", hint: "Couture, bâtiment, artisans", icon: Wrench, href: "/services" },
  { key: "art", name: "Art & Design", hint: "Peintres, sculpteurs, créatifs", icon: Palette, href: "/services" },
  { key: "form", name: "Formation", hint: "Cours, coaching, diplômes", icon: GraduationCap, href: "/services", span: "md:col-span-2" },
];

function AisleTile({ tile, index }: { tile: Tile; index: number }) {
  const { t } = useT();
  const [hover, setHover] = useState(false);
  const [slide, setSlide] = useState(0);
  const photos = AISLE_PHOTOS[tile.key];
  const big = tile.span?.includes("row-span");
  const wide = !!tile.span && !big;
  const w = big ? 900 : wide ? 760 : 460;
  const h = big ? 900 : 380;
  const current = photos[slide];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.06 }}
      className={`${tile.span ?? ""} ${tile.span ? "col-span-2" : ""}`}
    >
      <Link
        to={tile.href}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label={`${t(tile.name)} : ${t(tile.hint)}`}
        className="group relative h-full w-full overflow-hidden rounded-2xl border border-foreground/[0.08] bg-card/70 p-4 md:p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-18px_hsl(var(--primary)/0.55)]"
      >
        <AisleSlideshow photos={photos} width={w} height={h} interval={4200 + (index % 5) * 400} offset={index * 650} paused={hover} onIndex={setSlide} />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_25%_5%/0.92)] via-[hsl(240_25%_5%/0.3)] to-[hsl(240_25%_5%/0.15)]" />
        <div className="relative flex items-start justify-between">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur border border-white/15 text-white">
            <tile.icon className="w-5 h-5" />
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-black/45 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-white/85 tabular-nums">
              {hover ? <Pause className="inline w-3 h-3 -mt-0.5" aria-hidden="true" /> : null} {slide + 1}/{photos.length}
            </span>
            <ArrowUpRight className="w-5 h-5 text-white/80 transition-all group-hover:rotate-45" />
          </span>
        </div>
        <div className="relative">
          <h3 className={`font-display font-bold text-white ${big ? "text-2xl md:text-3xl" : "text-sm md:text-base"}`}>{t(tile.name)}</h3>
          <p className="text-xs md:text-sm mt-1 line-clamp-2 text-white/75">{t(tile.hint)}</p>
          <p className="mt-2 text-[10px] text-white/55 truncate" title={current.alt}>
            {current.alt} · {t("Photo")} {current.author}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// Ribbon of stalls under the grid: pick an aisle, its photos scroll past continuously.
function AisleRibbon() {
  const { t } = useT();
  const reduce = useReducedMotion();
  const [aisle, setAisle] = useState<AisleKey | "all">("all");
  const items = useMemo(() => {
    if (aisle !== "all") return AISLE_PHOTOS[aisle].map((p) => ({ p, tile: TILES.find((x) => x.key === aisle)! }));
    // Two photos from each aisle, interleaved, so "Tout" shows every aisle.
    return [0, 1].flatMap((n) => TILES.map((tile) => ({ p: AISLE_PHOTOS[tile.key][(n * 5 + 2) % AISLE_PHOTOS[tile.key].length], tile })));
  }, [aisle]);
  const loop = reduce ? items : [...items, ...items];
  const seconds = items.length * 4;
  return (
    <div className="mt-10">
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none" role="tablist" aria-label={t("Choisir une allée")}>
        {[{ key: "all" as const, name: "Tout le marché" }, ...TILES].map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={aisle === x.key}
            onClick={() => setAisle(x.key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${aisle === x.key ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
          >
            {t(x.name)}
          </button>
        ))}
      </div>
      <div className={`group relative ${reduce ? "overflow-x-auto" : "overflow-hidden"} [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]`}>
        <div
          key={aisle}
          className={`flex w-max gap-3 ${reduce ? "" : "animate-[aisle-scroll_linear_infinite] group-hover:[animation-play-state:paused]"}`}
          style={reduce ? undefined : { animationDuration: `${seconds}s` }}
        >
          {loop.map(({ p, tile }, i) => (
            <Link
              key={`${p.id}-${i}`}
              to={tile.href}
              aria-hidden={i >= items.length ? true : undefined}
              tabIndex={i >= items.length ? -1 : undefined}
              className="relative block h-40 w-56 md:h-48 md:w-72 shrink-0 overflow-hidden rounded-xl border border-foreground/10"
            >
              <img src={photoUrl(p, 576, 384)} alt={i >= items.length ? "" : p.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-8">
                <span className="block text-[11px] uppercase tracking-widest text-primary">{t(tile.name)}</span>
                <span className="block text-xs text-white/90 line-clamp-1">{p.alt}</span>
                <span className="block text-[10px] text-white/55">{t("Photo")} {p.author} · Unsplash</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const CategoriesSection = () => {
  const { t } = useT();
  return (
    <section className="relative py-20">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-3">{t("Les allées du marché")}</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              {t("Un marché,")} <span className="text-primary">{t("mille étals")}</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            {t("Du sac d'igname au dernier smartphone, du coiffeur au développeur : chaque allée est à portée de doigt.")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[170px] md:auto-rows-[190px] gap-3 md:gap-4">
          {TILES.map((tile, i) => <AisleTile key={tile.key} tile={tile} index={i} />)}
        </div>

        <AisleRibbon />
      </div>
    </section>
  );
};

export default CategoriesSection;
