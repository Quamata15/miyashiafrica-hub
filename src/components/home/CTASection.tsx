import { Button } from "@/components/ui/button";
import { Store, Briefcase, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const OFFERS = [
  {
    icon: Store,
    eyebrow: "Vendeurs",
    title: "Ouvrez votre étal numérique",
    points: ["Boutique gratuite en 2 minutes", "Clients dans 8 pays", "Paiement garanti par le séquestre"],
    cta: "Commencer à vendre",
    href: "/create?type=product",
    glow: "--neon-gold",
  },
  {
    icon: Briefcase,
    eyebrow: "Prestataires & freelances",
    title: "Vendez votre savoir-faire",
    points: ["Devis, missions et jalons", "Livrables suivis", "Retrait mobile money"],
    cta: "Proposer un service",
    href: "/create?type=service",
    glow: "--neon-emerald",
  },
];

const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-dark border border-white/10 p-6 md:p-12">
          <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-2 pattern-kente opacity-80" aria-hidden />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-[hsl(var(--neon-magenta)/0.25)] blur-[100px]" aria-hidden />

          <div className="relative text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold leading-tight text-[hsl(40_30%_96%)]">
              Votre place au <span className="text-gradient-hero">marché</span> vous attend
            </h2>
          </div>

          <div className="relative grid md:grid-cols-2 gap-4">
            {OFFERS.map((o, i) => (
              <motion.div
                key={o.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 overflow-hidden"
              >
                <div
                  className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-30"
                  style={{ background: `hsl(var(${o.glow}))` }}
                  aria-hidden
                />
                <span
                  className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `hsl(var(${o.glow}) / 0.18)` }}
                >
                  <o.icon className="w-6 h-6" style={{ color: `hsl(var(${o.glow}))` }} />
                </span>
                <p className="relative text-xs font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: `hsl(var(${o.glow}))` }}>
                  {o.eyebrow}
                </p>
                <h3 className="relative font-display text-xl md:text-2xl font-bold text-[hsl(40_30%_96%)] mb-5">{o.title}</h3>
                <ul className="relative space-y-2 mb-7">
                  {o.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-[hsl(250_12%_78%)]">
                      <Check className="w-4 h-4 shrink-0" style={{ color: `hsl(var(${o.glow}))` }} /> {p}
                    </li>
                  ))}
                </ul>
                <Link to={o.href} className="relative">
                  <Button className={`${i === 0 ? "bg-gradient-hero" : "bg-gradient-accent"} text-[hsl(250_40%_6%)] font-semibold rounded-xl h-12 px-6`}>
                    {o.cta} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
