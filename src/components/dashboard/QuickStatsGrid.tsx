import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onClick?: () => void;
}

interface QuickStatsGridProps {
  stats: StatItem[];
  loading?: boolean;
}

const QuickStatsGrid = ({ stats, loading }: QuickStatsGridProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card
            className={cn(
              "border-0 shadow-card hover:shadow-elevated transition-all duration-300 overflow-hidden group",
              stat.onClick && "cursor-pointer"
            )}
            onClick={stat.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                {stat.trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                    stat.trend === "up" && "text-accent bg-accent/10",
                    stat.trend === "down" && "text-destructive bg-destructive/10",
                    stat.trend === "neutral" && "text-muted-foreground bg-muted"
                  )}>
                    {stat.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {stat.trend === "down" && <TrendingDown className="w-3 h-3" />}
                    {stat.trend === "neutral" && <Minus className="w-3 h-3" />}
                    {stat.trendValue}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground leading-none mb-1">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" />
                ) : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default QuickStatsGrid;
