// Bookings and accepted quotes in Google Agenda (or any calendar app) through a private
// iCalendar link. Google refreshes subscribed calendars every few hours.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarPlus, Copy, RefreshCw } from "lucide-react";
import { Section } from "../kit";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar?token=`;

export default function CalendarSync() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const get = async (reset = false) => {
    if (reset && !confirm("L'ancien lien cessera de fonctionner. Continuer ?")) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("my_calendar_token", { p_reset: reset });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setUrl(BASE + data);
    if (reset) toast.success("Nouveau lien créé");
  };
  const google = url ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}` : "";
  return (
    <Section title="Synchroniser mon agenda" description="Vos rendez-vous et prestations acceptées apparaissent dans Google Agenda, sur votre téléphone.">
      {!url ? (
        <Button variant="outline" onClick={() => get()} disabled={busy}><CalendarPlus className="w-4 h-4 mr-1.5" />Obtenir mon lien d'agenda</Button>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href={google} target="_blank" rel="noreferrer"><CalendarPlus className="w-4 h-4 mr-1.5" />Ajouter à Google Agenda</a></Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Lien copié"))}><Copy className="w-4 h-4 mr-1.5" />Copier le lien</Button>
            <Button variant="ghost" onClick={() => get(true)} disabled={busy}><RefreshCw className="w-4 h-4 mr-1.5" />Changer le lien</Button>
          </div>
          <Input readOnly value={url} aria-label="Lien de l'agenda" className="text-xs" onFocus={(e) => e.target.select()} />
          <p className="text-xs text-muted-foreground">Gardez ce lien pour vous : il donne accès à vos rendez-vous. Google met l'agenda à jour toutes les quelques heures. Fonctionne aussi avec Apple Calendrier et Outlook.</p>
        </div>
      )}
    </Section>
  );
}
