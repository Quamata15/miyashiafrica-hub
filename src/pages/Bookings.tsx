// Appointments: client view and provider agenda (#31).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { errMsg } from "@/lib/ai";
import { useSpaces } from "@/hooks/useSpaces";
import PageShell, { EmptyState } from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityEditor } from "@/components/commerce/Services";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

type B = { id: string; service_id: string; provider_id: string; client_id: string; starts_at: string; ends_at: string; status: string; notes: string | null; service: { title: string } | null };
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" });

export default function Bookings() {
  const { user } = useAuth();
  const sp = useSpaces();
  const [list, setList] = useState<B[]>([]);
  const load = () => user && supabase.from("bookings").select("*, service:services(title)").or(`client_id.eq.${user.id},provider_id.eq.${user.id}`).order("starts_at", { ascending: false }).limit(200)
    .then(({ data }) => setList((data ?? []) as unknown as B[]));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);
  const cancel = async (b: B) => {
    if (!confirm("Annuler ce rendez-vous ? Le client est remboursé sur son portefeuille.")) return;
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: b.id });
    if (error) return toast.error(errMsg(error));
    toast.success("Rendez-vous annulé et remboursé"); load();
  };
  const card = (b: B, asProvider: boolean) => (
    <Card key={b.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <Link to={`/service/${b.service_id}`} className="font-semibold hover:text-primary">{b.service?.title}</Link>
        <p className="text-sm capitalize">{when(b.starts_at)}</p>
        {b.notes && <p className="text-sm text-muted-foreground">{b.notes}</p>}
      </div>
      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status === "confirmed" ? "Confirmé" : b.status === "cancelled" ? "Annulé" : "Terminé"}</Badge>
      {b.status === "confirmed" && new Date(b.starts_at) > new Date() && <Button variant="outline" size="sm" onClick={() => cancel(b)}>{asProvider ? "Annuler (rembourser)" : "Annuler"}</Button>}
    </CardContent></Card>
  );
  const mine = list.filter((b) => b.client_id === user?.id);
  const agenda = list.filter((b) => b.provider_id === user?.id);
  const provider = sp.can("provide");
  return (
    <PageShell title="Rendez-vous" description={provider ? "Vos réservations, votre agenda et vos disponibilités." : "Vos réservations de services."}>
      <Tabs defaultValue="mine">
        <TabsList><TabsTrigger value="mine">Mes réservations</TabsTrigger>{(provider || agenda.length > 0) && <TabsTrigger value="agenda">Mon agenda</TabsTrigger>}{provider && <TabsTrigger value="hours">Mes disponibilités</TabsTrigger>}</TabsList>
        <TabsContent value="mine" className="space-y-3 mt-4">{mine.length ? mine.map((b) => card(b, false)) : <EmptyState icon={<CalendarClock className="w-6 h-6" />} title="Aucune réservation">Choisissez un service et réservez un créneau. <Link to="/services" className="text-primary underline">Voir les services</Link></EmptyState>}</TabsContent>
        <TabsContent value="agenda" className="space-y-3 mt-4">{agenda.length ? agenda.map((b) => card(b, true)) : <EmptyState icon={<CalendarClock className="w-6 h-6" />} title="Aucun rendez-vous pris">Définissez vos disponibilités pour recevoir des réservations.</EmptyState>}</TabsContent>
        {provider && <TabsContent value="hours" className="mt-4"><AvailabilityEditor /></TabsContent>}
      </Tabs>
    </PageShell>
  );
}
