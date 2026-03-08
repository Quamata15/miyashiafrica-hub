import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, Briefcase, ShoppingCart, TrendingUp, Globe } from "lucide-react";

interface PlatformStats {
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalUsers: number;
}

const StatsSection = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalProducts: 0,
    totalServices: 0,
    totalOrders: 0,
    totalUsers: 0,
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchStats();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasLoaded]);

  const fetchStats = async () => {
    try {
      const [productsRes, servicesRes, ordersRes, usersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalProducts: productsRes.count || 0,
        totalServices: servicesRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
      });
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statsItems = [
    {
      icon: Users,
      value: stats.totalUsers || "10K+",
      label: "Utilisateurs actifs",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Package,
      value: stats.totalProducts || "50K+",
      label: "Produits listés",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: Briefcase,
      value: stats.totalServices || "5K+",
      label: "Services disponibles",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: ShoppingCart,
      value: stats.totalOrders || "25K+",
      label: "Transactions",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      value: "99%",
      label: "Satisfaction",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: Globe,
      value: "15+",
      label: "Pays couverts",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <section ref={sectionRef} className="py-12 md:py-16 bg-gradient-to-r from-primary via-secondary to-accent relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                             radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
          animate={{ x: [0, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">
            La confiance de milliers d'utilisateurs
          </h2>
          <p className="text-white/80">
            Des chiffres qui parlent d'eux-mêmes
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {statsItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 text-center hover:bg-white/20 transition-colors"
            >
              <motion.div
                className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/20 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <item.icon className="w-6 h-6 text-white" />
              </motion.div>
              <div className="font-display text-2xl md:text-3xl font-bold text-white mb-1">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </div>
              <div className="text-xs md:text-sm text-white/80">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
