// Show a feature only to the spaces it belongs to. Pages use <RequireSpace>, buttons and menu
// entries use <IfSpace>. When the space is missing, <SpaceLocked> explains why and, when the
// rules allow it, opens the space in one click.
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Plus, Loader2, Ban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { useSpaces, FEATURE_ROLES, FEATURE_LABEL, ROLE_LABEL, type Feature, type ProRole } from "@/hooks/useSpaces";

export function SpaceLocked({ feature, className, title }: { feature: Feature; className?: string; title?: string }) {
  const sp = useSpaces();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const roles = FEATURE_ROLES[feature] as readonly ProRole[];
  const names = roles.map((r) => ROLE_LABEL[r]).join(" ou ");
  const open = async (r: ProRole) => {
    setBusy(r);
    const res = await sp.activate(r);
    setBusy(null);
    if (res === "registration") navigate("/driver-registration");
  };
  return (
    <div className={cn("rounded-3xl border border-foreground/10 bg-card/80 p-6 md:p-8 text-center max-w-xl mx-auto", className)}>
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Lock className="h-6 w-6" /></span>
      <h2 className="font-display text-xl font-bold">{title ?? `Réservé à l'espace ${names}`}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Cette partie sert à {FEATURE_LABEL[feature]}. Elle s'affiche dès que votre compte a l'espace correspondant.</p>
      <div className="mt-5 space-y-2 text-left">
        {roles.map((r) => {
          const o = sp.option(r);
          return (
            <div key={r} className="flex flex-col gap-2 rounded-2xl border border-foreground/10 p-3 sm:flex-row sm:items-center">
              <p className="flex-1 font-medium">Espace {ROLE_LABEL[r]}</p>
              {o && !o.available ? (
                <p className="flex gap-1.5 text-xs text-amber-600 dark:text-amber-400 sm:max-w-[60%]"><Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />{o.reason}</p>
              ) : (
                <Button size="sm" onClick={() => open(r)} disabled={busy === r || sp.loading}>
                  {busy === r ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : r === "driver" ? <ArrowRight className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
                  {r === "driver" && o?.needs_registration ? "S'inscrire comme livreur" : "Activer"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {!sp.isAdmin && <p className="mt-4 text-xs text-muted-foreground">Vous utilisez {sp.used}/{sp.limit} espaces professionnels. L'espace Acheteur est toujours inclus.</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm"><Link to="/dashboard?gerer=1">Gérer mes espaces</Link></Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    </div>
  );
}

/** Page guard: the page renders only for the spaces that use it. */
export function RequireSpace({ feature, children }: { feature: Feature; children: ReactNode }) {
  const sp = useSpaces();
  if (sp.loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (sp.can(feature)) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-28 pb-16"><SpaceLocked feature={feature} /></main>
      <Footer />
    </div>
  );
}

/** Inline guard for buttons, menu entries and sections. */
export function IfSpace({ feature, children, fallback = null }: { feature: Feature; children: ReactNode; fallback?: ReactNode }) {
  const sp = useSpaces();
  if (sp.loading) return null;
  return <>{sp.can(feature) ? children : fallback}</>;
}
