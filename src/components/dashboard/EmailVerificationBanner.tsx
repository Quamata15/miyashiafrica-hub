import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationBannerProps {
  email: string;
}

const EmailVerificationBanner = ({ email }: EmailVerificationBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte mail (et vos spams).",
      });
    }
    setSending(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-yellow-300/50 bg-yellow-50/80 dark:bg-yellow-900/20 dark:border-yellow-700/40 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-yellow-500/15 dark:bg-yellow-800/40 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-yellow-400 dark:text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-yellow-400 dark:text-yellow-200">
          Vérifiez votre adresse email
        </h4>
        <p className="text-xs text-yellow-700/80 dark:text-yellow-300/70 mt-0.5">
          Confirmez <strong>{email}</strong> pour accéder à toutes les fonctionnalités de MIYASHI.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-8 text-xs border-yellow-400/60 text-yellow-400 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/30"
          onClick={handleResend}
          disabled={sending}
        >
          {sending ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Envoi...</>
          ) : (
            <><Mail className="w-3 h-3 mr-1" /> Renvoyer l'email</>
          )}
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDismissed(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default EmailVerificationBanner;
