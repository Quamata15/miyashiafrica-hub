import type { ReactNode, ElementType } from "react";
import { cn } from "@/lib/utils";

/** One-line form title: small icon, title and a short hint. */
export function FormHead({ icon: Icon, title, hint, tone = "bg-primary/10 text-primary", action }: { icon: ElementType; title: string; hint?: string; tone?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("w-9 h-9 shrink-0 rounded-lg flex items-center justify-center", tone)}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
        {hint && <p className="text-xs sm:text-sm text-muted-foreground truncate">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Keeps the submit button in reach on phones: it stays at the bottom of the screen while the form scrolls. */
export function StickySubmit({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-card/95 backdrop-blur border-t border-foreground/10",
      "sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-1 sm:bg-transparent sm:backdrop-blur-none sm:border-0",
      className,
    )}>
      {children}
    </div>
  );
}
