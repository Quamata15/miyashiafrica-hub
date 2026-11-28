// Newsletter confirmation and unsubscribe (links from the e-mails).
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, MailX } from "lucide-react";

export default function Newsletter() {
  const [params] = useSearchParams();
  const confirm = params.get("confirmer"), stop = params.get("desinscrire");
  const [state, setState] = useState<"loading" | "confirmed" | "unsubscribed" | "unknown">("loading");
  useEffect(() => {
    const token = confirm || stop;
    if (!token) { setState("unknown"); return; }
    supabase.rpc(confirm ? "confirm_newsletter" : "unsubscribe_newsletter", { p_token: token })
      .then(({ data }) => setState(((data as { status?: string } | null)?.status as typeof state) ?? "unknown"));
  }, [confirm, stop]);
  return (
    <PageShell title="Newsletter MIYASHI">
      <Card className="max-w-lg"><CardContent className="p-6 text-center space-y-3">
        {state === "loading" ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          : state === "confirmed" ? (<><MailCheck className="w-10 h-10 mx-auto text-emerald-500" /><p className="font-semibold">Inscription confirmée</p><p className="text-sm text-muted-foreground">Vous recevrez les meilleures offres et nouveautés. Chaque e-mail contient un lien pour vous désinscrire.</p></>)
          : state === "unsubscribed" ? (<><MailX className="w-10 h-10 mx-auto text-muted-foreground" /><p className="font-semibold">Vous êtes désinscrit</p><p className="text-sm text-muted-foreground">Vous ne recevrez plus la newsletter.</p></>)
          : (<p className="text-sm text-muted-foreground">Ce lien n'est plus valable.</p>)}
        <Button asChild variant="outline"><Link to="/">Retour à l'accueil</Link></Button>
      </CardContent></Card>
    </PageShell>
  );
}
