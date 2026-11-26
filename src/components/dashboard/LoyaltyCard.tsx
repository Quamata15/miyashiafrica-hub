import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Crown, Star, Gem, Trophy, Gift, TrendingUp, Percent, Truck, Zap } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LEVELS = {
  bronze: {
    label: "Bronze", icon: Star, color: "text-orange-400", bg: "bg-orange-500/15",
    min: 0, next: 2000,
    perks: ["1 pt / 100F d'achat", "Protection acheteur"],
    cashback: 0,
  },
  silver: {
    label: "Argent", icon: Gem, color: "text-slate-500", bg: "bg-slate-100",
    min: 2000, next: 5000,
    perks: ["2 pts / 100F d'achat", "2% cashback", "Offres exclusives"],
    cashback: 2,
  },
  gold: {
    label: "Or", icon: Crown, color: "text-yellow-400", bg: "bg-yellow-500/15",
    min: 5000, next: 10000,
    perks: ["3 pts / 100F d'achat", "5% cashback", "Livraison prioritaire", "Promos VIP"],
    cashback: 5,
  },
  platinum: {
    label: "Platine", icon: Trophy, color: "text-purple-400", bg: "bg-purple-500/15",
    min: 10000, next: 999999,
    perks: ["5 pts / 100F d'achat", "10% cashback", "Livraison gratuite", "Support prioritaire", "Accès avant-première"],
    cashback: 10,
  },
};

const PERK_ICONS: Record<string, React.ElementType> = {
  "cashback": Percent,
  "livraison": Truck,
  "pts": Gift,
  "default": Zap,
};

const getPerkIcon = (perk: string) => {
  const lower = perk.toLowerCase();
  if (lower.includes("cashback")) return Percent;
  if (lower.includes("livraison")) return Truck;
  if (lower.includes("pts") || lower.includes("pt")) return Gift;
  return Zap;
};

const LoyaltyCard = () => {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchLoyalty();
  }, [user]);

  const fetchLoyalty = async () => {
    if (!user) return;
    const [loyaltyRes, txRes] = await Promise.all([
      supabase.from("loyalty_points" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("loyalty_transactions" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
    if (txRes.data) setTransactions(txRes.data as any[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card animate-pulse">
        <CardContent className="p-6 h-40" />
      </Card>
    );
  }

  const level = (loyalty?.level as keyof typeof LEVELS) || "bronze";
  const levelInfo = LEVELS[level];
  const nextLevel = level === "platinum" ? null : LEVELS[Object.keys(LEVELS)[Object.keys(LEVELS).indexOf(level) + 1] as keyof typeof LEVELS];
  const points = loyalty?.points || 0;
  const totalEarned = loyalty?.total_earned || 0;
  const progress = nextLevel ? Math.min(100, ((totalEarned - levelInfo.min) / (nextLevel.min - levelInfo.min)) * 100) : 100;
  const Icon = levelInfo.icon;

  return (
    <div className="space-y-4">
      {/* Main loyalty card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-elevated overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-hero opacity-10" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${levelInfo.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${levelInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau fidélité</p>
                  <p className="text-xl font-display font-bold">{levelInfo.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{points}</p>
                <p className="text-xs text-muted-foreground">points disponibles</p>
              </div>
            </div>

            {/* Progress to next level */}
            {nextLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Prochain niveau : {nextLevel.label}</span>
                  <span className="font-medium">{totalEarned} / {nextLevel.min} pts</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Plus que <span className="font-semibold text-primary">{nextLevel.min - totalEarned}</span> points
                </p>
              </div>
            )}

            {/* Cashback highlight */}
            {levelInfo.cashback > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  {levelInfo.cashback}% de cashback sur chaque achat
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crédit automatique sur votre portefeuille MIYASHI
                </p>
              </div>
            )}

            {/* Perks */}
            <div className="mt-4 flex gap-2 flex-wrap">
              {levelInfo.perks.map((perk) => {
                const PerkIcon = getPerkIcon(perk);
                return (
                  <Badge key={perk} variant="outline" className="gap-1 text-xs">
                    <PerkIcon className="w-3 h-3" /> {perk}
                  </Badge>
                );
              })}
            </div>

            {/* Next level preview */}
            {nextLevel && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1.5">
                  🎯 Débloquez au niveau <span className="font-semibold">{nextLevel.label}</span> :
                </p>
                <div className="flex gap-2 flex-wrap">
                  {nextLevel.perks
                    .filter(p => !levelInfo.perks.includes(p))
                    .map((perk) => (
                      <Badge key={perk} variant="secondary" className="gap-1 text-[10px] opacity-70">
                        {perk}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historique des points</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 px-6">
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Badge className={tx.points > 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}>
                    {tx.points > 0 ? "+" : ""}{tx.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoyaltyCard;
