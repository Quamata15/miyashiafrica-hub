import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Smartphone, Globe2, Package, Users, Zap } from "lucide-react";
import { paymentsByCountry } from "@/utils/paymentMethods";

// Live counters are shown once the marketplace has real volume; before that the
// band shows the platform's promises instead of invented numbers.
const LIVE_THRESHOLD = 100;

const StatsSection = () => {
  const [counts, setCounts] = useState<{ products: number; users: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const [p, u] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("profiles_public").select("id", { count: "exact", head: true }),
        ]);
        setCounts({ products: p.count ?? 0, users: u.count ?? 0 });
      },
      { rootMargin: "200px" },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const countries = Object.keys(paymentsByCountry).length;
  const items = [
    { icon: ShieldCheck, value: "100%", label: "Paiements sous séquestre" },
    { icon: Smartphone, value: "Mobile money", label: "TMoney, Flooz, MTN, Orange, Wave" },
    { icon: Globe2, value: `${countries} pays`, label: "Afrique de l'Ouest" },
    { icon: Zap, value: "0 F", label: "Pour ouvrir sa boutique" },
  ];
  if (counts && counts.products >= LIVE_THRESHOLD) {
    items[3] = { icon: Package, value: counts.products.toLocaleString("fr-FR"), label: "Produits en ligne" };
  }
  if (counts && counts.users >= LIVE_THRESHOLD) {
    items[2] = { icon: Users, value: counts.users.toLocaleString("fr-FR"), label: "Membres vérifiés" };
  }

  return (
    <section ref={sectionRef} className="relative py-6 md:py-8">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-dark border border-foreground/10">
          <div className="absolute inset-x-0 top-0 h-1.5 pattern-kente opacity-90" aria-hidden />
          <div className="relative grid grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`p-4 md:p-6 flex flex-col gap-1.5 md:gap-2 ${i > 0 ? "lg:border-l" : ""} ${i % 2 ? "border-l lg:border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""} border-white/10`}
              >
                <item.icon className="w-6 h-6 text-[hsl(var(--neon-gold))]" />
                <div className="font-display text-xl md:text-3xl font-extrabold text-[hsl(40_30%_96%)]">{item.value}</div>
                <div className="text-xs md:text-sm text-[hsl(250_12%_72%)]">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
