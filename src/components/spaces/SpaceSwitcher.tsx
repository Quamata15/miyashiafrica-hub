// Switch between the spaces a user has, open new ones and close the ones they no longer use.
// The rules (compatible spaces only, 3 professional spaces at most, 30 days between opposite
// spaces) are enforced by the database; this screen shows them before the user tries.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Loader2, ArrowRight, Lock, Ban, Info, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useSpaces, ROLE_LABEL, type ProRole } from "@/hooks/useSpaces";
import { SPACES, type SpaceDef } from "./registry";
import type { SpaceKey } from "./guides";

const CLOSE_EFFECT: Record<ProRole, string> = {
  seller: "Vos produits sont retirés de la vente (ils restent enregistrés).",
  provider: "Vos services sont retirés et vos devis en attente sont annulés.",
  employer: "Vos offres d'emploi et missions sont clôturées.",
  freelance: "Vos candidatures en attente sont retirées et votre profil quitte le vivier des recruteurs.",
  driver: "Vous n'êtes plus disponible et les courses qui vous étaient proposées repartent aux autres livreurs.",
};

export function AddSpaceDialog({ open, onOpenChange, onActivated }: { open: boolean; onOpenChange: (o: boolean) => void; onActivated: (space: SpaceKey) => void }) {
  const navigate = useNavigate();
  const sp = useSpaces();
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState<SpaceDef | null>(null);

  const activate = async (s: SpaceDef) => {
    if (s.activation === "always") return;
    setBusy(s.key);
    const res = await sp.activate(s.role as ProRole);
    setBusy(null);
    if (res === "registration") { onOpenChange(false); navigate("/driver-registration"); return; }
    if (res) { onOpenChange(false); onActivated(s.key); }
  };
  const close = async () => {
    if (!closing) return;
    setBusy(closing.key);
    const ok = await sp.deactivate(closing.role as ProRole);
    setBusy(null); setClosing(null);
    if (ok) onActivated("acheteur");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vos espaces MIYASHI</DialogTitle>
            <DialogDescription>
              L'espace Acheteur est toujours inclus. {sp.isAdmin ? "En tant qu'administrateur, vous avez accès à tous les espaces." : `Vous pouvez ouvrir jusqu'à ${sp.limit} espaces professionnels compatibles entre eux.`}
            </DialogDescription>
          </DialogHeader>
          {!sp.isAdmin && (
            <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">{sp.used}/{sp.limit} espaces professionnels</span>
              <div className="flex gap-1" aria-hidden>{Array.from({ length: sp.limit }, (_, i) => <span key={i} className={cn("h-2 w-8 rounded-full", i < sp.used ? "bg-primary" : "bg-foreground/10")} />)}</div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {SPACES.map((s) => {
              const o = s.activation === "always" ? undefined : sp.option(s.role as ProRole);
              const has = s.activation === "always" || sp.has(s.role);
              const blocked = !has && o && !o.available;
              return (
                <div key={s.key} className={cn("rounded-2xl border p-4 flex flex-col", has ? "border-emerald-500/30 bg-emerald-500/[0.04]" : blocked ? "border-foreground/10 bg-muted/30" : "border-foreground/10")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", blocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}><s.icon className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1"><p className="font-semibold">{s.label}</p><p className="text-xs text-muted-foreground">{s.tagline}</p></div>
                    {has && <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">{s.activation === "always" ? "Inclus" : "Actif"}</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground flex-1">{s.description}</p>
                  {blocked && <p className="mt-2 flex gap-1.5 text-xs text-amber-600 dark:text-amber-400"><Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />{o!.reason}</p>}
                  {!has && !blocked && s.activation === "driver" && <p className="mt-2 text-xs text-muted-foreground">Inscription avec zone, véhicule, permis et signature de la charte.</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {has ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onActivated(s.key); }}><Check className="w-4 h-4 mr-1" />Ouvrir</Button>
                        {s.activation !== "always" && !sp.isAdmin && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setClosing(s)}>Fermer cet espace</Button>}
                      </>
                    ) : blocked ? (
                      <Button size="sm" variant="outline" disabled><Lock className="w-4 h-4 mr-1" />Indisponible</Button>
                    ) : (
                      <Button size="sm" onClick={() => activate(s)} disabled={busy === s.key || sp.loading}>
                        {busy === s.key ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : s.activation === "driver" ? <ArrowRight className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                        {s.activation === "driver" ? "S'inscrire comme livreur" : "Activer cet espace"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-foreground/10 p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="w-3.5 h-3.5" />Pourquoi certains espaces ne vont pas ensemble</p>
            <p>Recruteur et Freelance : on ne recrute pas et ne candidate pas avec le même compte.</p>
            <p>Vendeur et Freelance : une boutique est une activité commerciale, l'espace Freelance sert à postuler.</p>
            <p>Vendeur et Livreur : un vendeur ne livre pas ses propres commandes, car la preuve de remise libère le paiement.</p>
            <p>Après avoir fermé un espace, l'espace opposé s'ouvre 30 jours plus tard.</p>
            {sp.isAdmin && <p className="flex items-center gap-1.5"><InfinityIcon className="w-3.5 h-3.5" />Ces règles ne s'appliquent pas au compte administrateur.</p>}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fermer l'espace {closing?.label} ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{closing && CLOSE_EFFECT[closing.role as ProRole]}</p>
                <p>Vous pourrez le rouvrir plus tard. Un espace incompatible avec celui-ci ne pourra être ouvert que 30 jours après la fermeture.</p>
                <p>Impossible tant qu'une commande, un rendez-vous, un entretien ou une course est en cours : vous verrez lequel.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder l'espace</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); close(); }} disabled={!!busy}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Fermer l'espace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SpaceSwitcher({ spaces, active, onChange, onAdd }: { spaces: SpaceDef[]; active: SpaceKey; onChange: (k: SpaceKey) => void; onAdd: () => void }) {
  const sp = useSpaces();
  const canAdd = sp.isAdmin ? spaces.length < SPACES.length : sp.options.some((o) => !o.active && o.available);
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Espaces">
      {spaces.map((s) => (
        <button key={s.key} role="tab" aria-selected={active === s.key} onClick={() => onChange(s.key)}
          className={cn("shrink-0 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors", active === s.key ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card/70 hover:border-primary/40")}>
          <s.icon className="w-4 h-4" />{s.label}
        </button>
      ))}
      <button onClick={onAdd} className="shrink-0 flex items-center gap-1.5 rounded-full border border-dashed border-foreground/25 px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40">
        {canAdd ? <><Plus className="w-4 h-4" />Ajouter un espace</> : <>Gérer mes espaces</>}
      </button>
    </div>
  );
}

export const roleLabel = (r: string) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r;
