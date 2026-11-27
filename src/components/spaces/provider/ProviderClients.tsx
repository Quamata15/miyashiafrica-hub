// The provider's clients, from orders, quotes and bookings.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Empty, Section, dateFr, fcfa, openConversation, useRpc } from "../kit";

type Client = { client_id: string; full_name: string | null; avatar_url: string | null; phone: string | null; orders: number; spent: number; quotes: number; bookings: number; last_at: string };

export default function ProviderClients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading } = useRpc<Client[]>("get_provider_clients");
  const [q, setQ] = useState("");
  const list = (data ?? []).filter((c) => !q || (c.full_name ?? "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Section title="Clients" description="Toutes les personnes qui vous ont commandé, demandé un devis ou réservé un rendez-vous."
      action={<div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input aria-label="Rechercher un client" className="pl-8 w-48" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" /></div>}>
      {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
        <Empty icon={Users} title="Pas encore de clients" text="Vos clients apparaîtront ici après leur première commande, demande de devis ou réservation." />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((c) => (
            <li key={c.client_id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar className="h-10 w-10"><AvatarImage src={c.avatar_url ?? undefined} alt="" /><AvatarFallback>{(c.full_name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-[160px]">
                <p className="font-medium">{c.full_name ?? "Client"}</p>
                <p className="text-xs text-muted-foreground">{c.orders} commande(s) · {c.quotes} devis · {c.bookings} rendez-vous · dernier contact {dateFr(c.last_at)}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{fcfa(c.spent)}</span>
              {user && <Button size="sm" variant="outline" onClick={() => openConversation(user.id, c.client_id, navigate)}><MessageSquare className="w-4 h-4 mr-1" />Écrire</Button>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
