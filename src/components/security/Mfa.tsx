// Two-factor authentication (TOTP app: Google Authenticator, Authy, Microsoft Authenticator…).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

type Factor = { id: string; friendly_name?: string; status: string; factor_type: string };

export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.factor_type === "totp"));
  }, []);
  useEffect(() => { load(); }, [load]);
  const verified = factors.filter((f) => f.status === "verified");

  const start = async () => {
    // Remove abandoned, unverified attempts first.
    for (const f of factors.filter((x) => x.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `MIYASHI ${new Date().toLocaleDateString("fr-FR")}` });
    if (error || !data) return toast.error("Activation impossible");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const confirm = async () => {
    if (!enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error("Code incorrect, réessayez avec le code affiché maintenant");
    toast.success("Double authentification activée");
    setEnroll(null); setCode(""); load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Désactiver la double authentification ?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error("Reconnectez-vous avec votre code puis réessayez");
    toast.success("Double authentification désactivée"); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-accent" /><span className="font-medium">Double authentification</span>{verified.length ? <Badge>Activée</Badge> : <Badge variant="secondary">Désactivée</Badge>}</div>
      <p className="text-sm text-muted-foreground">À chaque connexion, un code à 6 chiffres de votre application d'authentification (Google Authenticator, Authy, Microsoft Authenticator) est demandé en plus du mot de passe. Fortement recommandé pour les vendeurs, indispensable pour les administrateurs.</p>
      {verified.map((f) => (
        <div key={f.id} className="flex items-center justify-between rounded-xl border border-foreground/10 p-3 text-sm"><span>{f.friendly_name ?? "Application d'authentification"}</span><Button variant="ghost" size="sm" onClick={() => remove(f.id)}>Désactiver</Button></div>
      ))}
      {!verified.length && !enroll && <Button variant="outline" onClick={start}>Activer la double authentification</Button>}
      {enroll && (
        <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
          <p className="text-sm">1. Scannez ce QR code avec votre application d'authentification.</p>
          <img src={enroll.qr} alt="QR code de configuration" className="w-44 h-44 bg-white rounded-lg p-2" />
          <p className="text-xs text-muted-foreground break-all">Ou saisissez la clé : <span className="font-mono">{enroll.secret}</span></p>
          <p className="text-sm">2. Entrez le code à 6 chiffres affiché.</p>
          <div className="flex gap-2"><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-36 text-center font-mono tracking-widest" aria-label="Code" />
            <Button onClick={confirm} disabled={busy || code.length !== 6}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmer</Button></div>
        </div>
      )}
    </div>
  );
}

/** Asks for the 6-digit code when the account has 2FA but the session is not yet verified (aal1 → aal2). */
export function MfaGate() {
  const { user, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) { setFactorId(null); return; }
    (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch((e) => ({ data: null, error: e }));
      if (error) return;
      if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        const { data: f } = await supabase.auth.mfa.listFactors();
        const totp = (f?.totp ?? []).find((x) => x.status === "verified");
        setFactorId(totp?.id ?? null);
      } else setFactorId(null);
    })();
  }, [user]);
  if (!factorId) return null;
  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) { setCode(""); return toast.error("Code incorrect"); }
    setFactorId(null); setCode("");
  };
  return (
    <Dialog open>
      <DialogContent className="max-w-sm [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle>Vérification en deux étapes</DialogTitle><DialogDescription>Entrez le code à 6 chiffres de votre application d'authentification.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl font-mono tracking-[0.5em] h-14" aria-label="Code de vérification" />
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Valider</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>Se déconnecter</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Admins must use 2FA: a blocking notice until it is set up. */
export function useHasMfa() {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => { supabase.auth.mfa.listFactors().then(({ data }) => setHas((data?.totp ?? []).some((f) => f.status === "verified")), () => setHas(null)); }, []);
  return has;
}
