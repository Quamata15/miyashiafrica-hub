import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { photoUrl, photoSrcSet, type Photo } from "@/lib/photos";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  photo?: Photo;
  children?: ReactNode;
  /** Tailwind object-position class for the photo crop. */
  focus?: string;
  /** Shorter banner for pages whose main content is a form. */
  compact?: boolean;
}

/** Photo banner used at the top of the main listing pages. */
const PageHero = ({ eyebrow, title, description, photo, children, focus = "object-[center_30%]", compact }: PageHeroProps) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-3xl border border-foreground/10 flex items-end ${compact ? "mb-4 min-h-[120px] md:min-h-[150px]" : "mb-5 md:mb-6 min-h-[170px] md:min-h-[220px]"}`}
  >
    {photo && (
      <img
        src={photoUrl(photo, 1600, 520)}
        srcSet={photoSrcSet(photo, [640, 1024, 1600], 0.33)}
        sizes="(min-width: 1280px) 1200px, 100vw"
        alt={photo.alt}
        className={`absolute inset-0 h-full w-full object-cover ${focus}`}
        fetchPriority="high"
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-[hsl(240_25%_5%/0.92)] via-[hsl(240_25%_5%/0.7)] to-[hsl(240_25%_5%/0.25)]" />
    <div className="absolute inset-x-0 bottom-0 h-1 pattern-kente opacity-70" aria-hidden />
    <div className={`relative w-full ${compact ? "p-4 md:p-6" : "p-5 md:p-8"}`}>
      {eyebrow && <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-2">{eyebrow}</p>}
      <h1 className={`font-display font-extrabold text-white mb-2 max-w-2xl ${compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"}`}>{title}</h1>
      {description && <p className={`text-white/75 max-w-2xl ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`}>{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  </motion.section>
);

export default PageHero;
