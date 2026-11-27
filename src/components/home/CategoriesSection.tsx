import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  /** Category slug whose real listings scroll in the ribbon. */
  cat: string;
  span?: string;
};

const TILES: Tile[] = [
  { key: "mode", name: "Mode & Pagne", hint: "Pagnes wax, chaussures, sacs", icon: Shirt, href: "/marketplace?categorie=mode-textile", cat: "mode-textile", span: "md:col-span-2 md:row-span-2" },
  { key: "vivres", name: "Vivres & Marché", hint: "Fruits, épices, produits secs", icon: Apple, href: "/marketplace?categorie=alimentation", cat: "alimentation", span: "md:col-span-2" },
  { key: "electro", name: "Électronique", hint: "Téléphones, casques, accessoires", icon: Smartphone, href: "/marketplace?categorie=electronique", cat: "electronique" },
  { key: "maison", name: "Maison & Déco", hint: "Vannerie, poterie, déco", icon: Home, href: "/marketplace?categorie=maison-deco", cat: "maison-deco" },
  { key: "auto", name: "Auto & Moto", hint: "Motos, pièces, casques", icon: Car, href: "/marketplace?categorie=vehicules", cat: "vehicules", span: "md:col-span-2" },
  { key: "agri", name: "Agriculture", hint: "Cacao, céréales, semences", icon: Sprout, href: "/marketplace?categorie=agriculture", cat: "agriculture" },
  { key: "beaute", name: "Beauté", hint: "Karité, savons, soins", icon: Sparkles, href: "/marketplace?categorie=beaute-sante", cat: "beaute-sante" },
  { key: "services", name: "Services pro", hint: "Couture, bâtiment, artisans", icon: Wrench, href: "/services", cat: "" },
  { key: "art", name: "Art & Artisanat", hint: "Masques, sculptures, peintures", icon: Palette, href: "/marketplace?categorie=artisanat", cat: "artisanat" },
  { key: "form", name: "Formation", hint: "Livres, fournitures, cours", icon: GraduationCap, href: "/services?categorie=formation", cat: "", span: "md:col-span-2" },
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
          {/* What is on the stall right now, then the photographer's credit. */}
          <p className="mt-2 inline-flex max-w-full items-center rounded-full bg-black/50 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-white" aria-live="off">
            <span className="truncate" title={current.alt}>{current.alt}</span>
          </p>
          <p className="mt-1 text-[10px] text-white/50 truncate">{t("Photo")} {current.author} · Unsplash</p>
        </div>
      </Link>
    </motion.div>
  );
}

type Listing = { id: string; title: string; price: number; images: string[] | null; category: { slug: string } | null };
type RibbonItem = { kind: "product"; l: Listing; tile: Tile } | { kind: "photo"; p: (typeof AISLE_PHOTOS)[AisleKey][number]; tile: Tile };
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

// Ribbon under the grid: pick an aisle, the articles really on sale there scroll past (photo, name,
// price, link). Aisles without listings yet show their stall photos instead.
function AisleRibbon() {
  const { t } = useT();
  const reduce = useReducedMotion();
  const [aisle, setAisle] = useState<AisleKey | "all">("all");
  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => {
    supabase.from("products").select("id, title, price, images, category:categories(slug)").eq("is_active", true).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(150)
      .then(({ data }) => setListings(((data ?? []) as unknown as Listing[]).filter((l) => l.images?.[0])));
  }, []);
  const items = useMemo<RibbonItem[]>(() => {
    const forTile = (tile: Tile) => listings.filter((l) => tile.cat && l.category?.slug === tile.cat).map((l) => ({ kind: "product" as const, l, tile }));
    const photos = (tile: Tile) => AISLE_PHOTOS[tile.key].map((p) => ({ kind: "photo" as const, p, tile }));
    if (aisle !== "all") {
      const tile = TILES.find((x) => x.key === aisle)!;
      const real = forTile(tile);
      // Real listings first, then stall photos so the ribbon always has enough to scroll.
      return real.length >= 6 ? real : [...real, ...photos(tile)];
    }
    // Two articles from each aisle, interleaved, so "Tout le marché" shows every aisle.
    return [0, 1].flatMap((n) => TILES.map((tile) => {
      const real = forTile(tile);
      return real[n] ?? photos(tile)[(n * 5 + 2) % AISLE_PHOTOS[tile.key].length];
    }));
  }, [aisle, listings]);
  const loop = reduce ? items : [...items, ...items];
  const seconds = items.length * 4;
  return (
    <div className="mt-6">
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
          className={`flex w-max gap-3 ${reduce ? "" : "animate-[aisle-scroll_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"}`}
          style={reduce ? undefined : { animationDuration: `${seconds}s` }}
        >
          {loop.map((it, i) => {
            const dup = i >= items.length;
            const common = "relative block h-44 w-56 md:h-52 md:w-72 shrink-0 overflow-hidden rounded-xl border border-foreground/10 bg-muted";
            if (it.kind === "product") {
              const img = it.l.images![0];
              const src = img.includes("images.unsplash.com") ? `${img.split("?")[0]}?auto=format&fit=crop&w=576&h=416&q=70` : img;
              return (
                <Link key={`${it.l.id}-${i}`} to={`/product/${it.l.id}`} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined} className={common}>
                  <img src={src} alt={dup ? "" : it.l.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{t("En vente")}</span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2.5 pt-10">
                    <span className="block text-[11px] uppercase tracking-widest text-primary">{t(it.tile.name)}</span>
                    <span className="block text-sm font-medium text-white line-clamp-1">{it.l.title}</span>
                    <span className="block text-xs font-semibold text-white/90">{fcfa(Number(it.l.price))}</span>
                  </span>
                </Link>
              );
            }
            return (
              <Link key={`${it.p.id}-${i}`} to={it.tile.href} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined} className={common}>
                <img src={photoUrl(it.p, 576, 416)} alt={dup ? "" : it.p.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-8">
                  <span className="block text-[11px] uppercase tracking-widest text-primary">{t(it.tile.name)}</span>
                  <span className="block text-xs text-white/90 line-clamp-1">{it.p.alt}</span>
                  <span className="block text-[10px] text-white/55">{t("Photo")} {it.p.author} · Unsplash</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CategoriesSection = () => {
  const { t } = useT();
  return (
    <section className="relative py-10 md:py-14">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-3">{t("Les allées du marché")}</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              {t("Un marché,")} <span className="text-primary">{t("mille étals")}</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            {t("Pagnes, karité, cacao, smartphones, pièces de moto… Chaque allée fait défiler ce que vous y trouverez, et les articles en vente aujourd'hui.")}
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
