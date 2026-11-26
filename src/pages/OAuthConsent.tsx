import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type OAuthResult = { data: any; error: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirmer votre identité",
  email: "Partager votre adresse email",
  profile: "Partager votre profil de base",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Demande d'autorisation invalide ou expirée.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e) {
        if (active) setError((e as Error).message ?? "Erreur du serveur d'autorisation.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("Aucune redirection reçue du serveur d'autorisation."); }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError((e as Error).message ?? "L'action a échoué.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "Une application";
  const redirectUri = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes: string[] = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
      <Card className="w-full max-w-md border-0 shadow-card">
        {error ? (
          <CardContent className="p-6 text-center text-sm text-destructive">
            Impossible de charger cette demande : {error}
          </CardContent>
        ) : !details ? (
          <CardContent className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></CardContent>
        ) : (
          <>
            <CardHeader>
              <ShieldCheck className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="font-display text-xl">Connecter {clientName} à MIYASHI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{clientName} pourra utiliser les outils de MIYASHI en votre nom.</p>
              {user?.email && <p className="text-muted-foreground">Compte : <strong className="text-foreground">{user.email}</strong></p>}
              {redirectUri && <p className="text-muted-foreground break-all">Redirection : {redirectUri}</p>}
              {scopes.length > 0 && (
                <ul className="space-y-1">
                  {scopes.map((s) => <li key={s}>• {SCOPE_LABELS[s] ?? `Autorisation supplémentaire : ${s}`}</li>)}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Cela ne contourne pas les permissions de MIYASHI : vous ne verrez que vos propres données.</p>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Autoriser</Button>
                <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Annuler la connexion</Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
