import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Briefcase, Users, User, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "product" | "service" | "freelance" | "job";
  title: string;
  subtitle: string;
  image?: string;
}

const typeConfig = {
  product: { icon: Package, label: "Produit", path: "/product" },
  service: { icon: Briefcase, label: "Service", path: "/service" },
  freelance: { icon: User, label: "Freelance", path: "/user" },
  job: { icon: Users, label: "Emploi", path: "/freelance" },
};

const GlobalSearch = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(() => search(query.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const search = async (rawQ: string) => {
    const q = rawQ.replace(/[,()*%\\:."]/g, " ").trim();
    if (!q) return;
    setLoading(true);
    setOpen(true);

    const [prodRes, servRes, freelRes, jobRes] = await Promise.all([
      supabase.from("products")
        .select("id, title, price, images")
        .eq("is_active", true).is("deleted_at", null)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(4),
      supabase.from("services")
        .select("id, title, price, images")
        .eq("is_active", true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(4),
      supabase.from("freelance_profiles_public")
        .select("id, user_id, title, photo_url, skills")
        .or(`title.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(3),
      supabase.from("jobs")
        .select("id, title, job_type, budget_max")
        .eq("is_active", true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(3),
    ]);

    const all: SearchResult[] = [
      ...(prodRes.data || []).map(p => ({
        id: p.id, type: "product" as const,
        title: p.title,
        subtitle: p.price ? `${Number(p.price).toLocaleString()} FCFA` : "",
        image: p.images?.[0],
      })),
      ...(servRes.data || []).map(s => ({
        id: s.id, type: "service" as const,
        title: s.title,
        subtitle: s.price ? `${Number(s.price).toLocaleString()} FCFA` : "Sur devis",
        image: s.images?.[0],
      })),
      ...(freelRes.data || []).map(f => ({
        id: f.user_id || f.id, type: "freelance" as const,
        title: f.title || "Freelance",
        subtitle: f.skills?.slice(0, 2).join(", ") || "",
        image: f.photo_url || undefined,
      })),
      ...(jobRes.data || []).map(j => ({
        id: j.id, type: "job" as const,
        title: j.title,
        subtitle: j.budget_max ? `Jusqu'à ${Number(j.budget_max).toLocaleString()} FCFA` : j.job_type || "",
      })),
    ];

    setResults(all);
    setLoading(false);
  };

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    const config = typeConfig[r.type];
    if (r.type === "job") {
      navigate("/freelance?tab=jobs");
    } else {
      navigate(`${config.path}/${r.id}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(query)}`);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher produits, services, freelances..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="w-full h-10 pl-10 pr-8 rounded-xl bg-muted/50 border border-border focus:border-primary focus:bg-card focus:shadow-md outline-none transition-all duration-300 text-sm"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {open && (results.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 max-md:fixed max-md:inset-x-3 max-md:top-14 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden max-h-96 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Group by type */}
                {(["product", "service", "freelance", "job"] as const).map(type => {
                  const items = results.filter(r => r.type === type);
                  if (items.length === 0) return null;
                  const config = typeConfig[type];
                  const Icon = config.icon;

                  return (
                    <div key={type}>
                      <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Icon className="w-3 h-3" />
                        {config.label}s ({items.length})
                      </div>
                      {items.map(r => (
                        <button
                          key={`${r.type}-${r.id}`}
                          onClick={() => handleSelect(r)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {r.image ? (
                              <img src={r.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* View all */}
                <button
                  onClick={handleSubmit as any}
                  className="w-full px-4 py-3 text-center text-sm text-primary font-medium hover:bg-primary/5 transition-colors border-t border-border"
                >
                  Voir tous les résultats pour "{query}"
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
