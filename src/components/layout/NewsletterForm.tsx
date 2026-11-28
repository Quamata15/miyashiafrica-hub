// Footer newsletter: double opt-in (a confirmation e-mail is sent), unsubscribe link in every e-mail.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("subscribe_newsletter", { p_email: email, p_source: "footer" });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    if ((data as { status: string }).status === "already") toast.message("Vous êtes déjà inscrit.");
    else toast.success("Presque fini : confirmez depuis l'e-mail que nous venons de vous envoyer.");
    setEmail("");
  };
  return (
    <form onSubmit={submit} className="flex w-full lg:w-auto gap-3">
      <label htmlFor="nl-email" className="sr-only">Votre adresse e-mail</label>
      <Input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse email"
        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 w-full lg:w-80" />
      <Button type="submit" variant="hero" className="shrink-0" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}S'abonner</Button>
    </form>
  );
}
