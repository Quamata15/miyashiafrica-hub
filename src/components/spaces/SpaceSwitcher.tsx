// Switch between the spaces a user has, and open new ones (seller, provider, freelance,
// recruiter in one click; driver through the registration with identity check and charter).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SPACES, type SpaceDef } from "./registry";
import type { SpaceKey } from "./guides";
import { attempt } from "./kit";

export function AddSpaceDialog({ open, onOpenChange, roles, onActivated }: { open: boolean; onOpenChange: (o: boolean) => void; roles: string[]; onActivated: (space: SpaceKey) => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const activate = async (s: SpaceDef) => {
    if (s.activation === "driver") { onOpenChange(false); return navigate("/driver-registration"); }
    setBusy(s.key);
    const ok = await attempt(() => supabase.rpc("assign_own_role", { p_role: s.role }), `Espace ${s.label} activé`);
    setBusy(null);
    if (ok) { onOpenChange(false); onActivated(s.key); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vos espaces MIYASHI</DialogTitle><DialogDescription>Un seul compte pour acheter, vendre, livrer, proposer des services, travailler en freelance et recruter. Chaque espace a son tableau de bord et son guide.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {SPACES.map((s) => {
            const has = s.activation === "always" || roles.includes(s.role);
            return (
              <div key={s.key} className={cn("rounded-2xl border p-4 flex flex-col", has ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-foreground/10")}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><s.icon className="w-5 h-5" /></span>
                  <div><p className="font-semibold">{s.label}</p><p className="text-xs text-muted-foreground">{s.tagline}</p></div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{s.description}</p>
                {s.activation === "driver" && !has && <p className="mt-2 text-xs text-muted-foreground">Inscription avec pièce d'identité, permis et signature de la charte.</p>}
                <div className="mt-3">
                  {has ? <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onActivated(s.key); }}><Check className="w-4 h-4 mr-1" />Ouvrir</Button>
                    : <Button size="sm" onClick={() => activate(s)} disabled={busy === s.key}>{busy === s.key ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : s.activation === "driver" ? <ArrowRight className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}{s.activation === "driver" ? "S'inscrire comme livreur" : "Activer cet espace"}</Button>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SpaceSwitcher({ spaces, active, onChange, onAdd }: { spaces: SpaceDef[]; active: SpaceKey; onChange: (k: SpaceKey) => void; onAdd: () => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Espaces">
      {spaces.map((s) => (
        <button key={s.key} role="tab" aria-selected={active === s.key} onClick={() => onChange(s.key)}
          className={cn("shrink-0 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors", active === s.key ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card/70 hover:border-primary/40")}>
          <s.icon className="w-4 h-4" />{s.label}
        </button>
      ))}
      {spaces.length < SPACES.length && <button onClick={onAdd} className="shrink-0 flex items-center gap-1.5 rounded-full border border-dashed border-foreground/25 px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40"><Plus className="w-4 h-4" />Ajouter un espace</button>}
    </div>
  );
}
