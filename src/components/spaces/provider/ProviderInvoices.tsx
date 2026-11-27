// Provider invoices: drafts you can edit, issued invoices frozen, numbered per year (F2026-0001).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Plus, Trash2, Printer, Send, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Section, Stat, attempt, dateFr, fcfa, useRpc } from "../kit";

type Item = { label: string; qty: number; unit_price: number };
type Inv = { id: string; number: string; status: "draft" | "sent" | "paid" | "cancelled"; client_id: string | null; client_name: string; client_email: string | null; client_phone: string | null; client_address: string | null;
  items: Item[]; vat_rate: number; discount: number; total: number; issued_at: string; due_date: string | null; notes: string | null; paid_at: string | null };
type Client = { client_id: string; full_name: string | null; phone: string | null };

const STATUS = { draft: ["Brouillon", "secondary"], sent: ["À encaisser", "default"], paid: ["Payée", "default"], cancelled: ["Annulée", "destructive"] } as const;
const empty = (): Partial<Inv> => ({ client_name: "", items: [{ label: "", qty: 1, unit_price: 0 }], vat_rate: 0, discount: 0, due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), notes: "" });

export default function ProviderInvoices() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Inv[] | null>(null);
  const [edit, setEdit] = useState<Partial<Inv> | null>(null);
  const [filter, setFilter] = useState<"all" | Inv["status"]>("all");
  const { data: clients } = useRpc<Client[]>("get_provider_clients");

  const load = () => user && supabase.from("provider_invoices").select("*").eq("provider_id", user.id).order("issued_at", { ascending: false }).order("number", { ascending: false })
    .then(({ data }) => setRows((data ?? []) as unknown as Inv[]));
  useEffect(() => { load(); }, [user?.id]);

  const totals = useMemo(() => {
    const it = (edit?.items ?? []) as Item[];
    const sub = Math.round(it.reduce((s, x) => s + (Number(x.qty) || 0) * (Number(x.unit_price) || 0), 0));
    const disc = Math.min(Number(edit?.discount) || 0, sub);
    const vat = Math.round((sub - disc) * (Number(edit?.vat_rate) || 0) / 100);
    return { sub, disc, vat, total: sub - disc + vat };
  }, [edit]);

  const save = async (status: "draft" | "sent") => {
    if (!user || !edit) return;
    const items = (edit.items ?? []).filter((i) => i.label.trim()).map((i) => ({ label: i.label.trim(), qty: Number(i.qty), unit_price: Number(i.unit_price) }));
    const row = { provider_id: user.id, client_id: edit.client_id ?? null, client_name: (edit.client_name ?? "").trim(), client_email: edit.client_email || null, client_phone: edit.client_phone || null,
      client_address: edit.client_address || null, items, vat_rate: Number(edit.vat_rate) || 0, discount: Number(edit.discount) || 0, due_date: edit.due_date || null, notes: edit.notes || null, status };
    const ok = edit.id
      ? await attempt(() => supabase.from("provider_invoices").update(row).eq("id", edit.id!), status === "sent" ? "Facture émise et envoyée" : "Brouillon enregistré")
      : await attempt(() => supabase.from("provider_invoices").insert(row), status === "sent" ? "Facture émise et envoyée" : "Brouillon enregistré");
    if (ok) { setEdit(null); load(); }
  };
  const setStatus = async (inv: Inv, status: Inv["status"], msg: string) => {
    if (await attempt(() => supabase.from("provider_invoices").update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}) }).eq("id", inv.id), msg)) load();
  };
  const remove = async (inv: Inv) => { if (await attempt(() => supabase.from("provider_invoices").delete().eq("id", inv.id), "Brouillon supprimé")) load(); };
  const pickClient = (id: string) => {
    const c = clients?.find((x) => x.client_id === id);
    setEdit((e) => ({ ...e, client_id: id, client_name: c?.full_name ?? e?.client_name ?? "", client_phone: c?.phone ?? e?.client_phone ?? "" }));
  };
  const setItem = (i: number, patch: Partial<Item>) => setEdit((e) => ({ ...e, items: (e?.items ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const list = (rows ?? []).filter((r) => filter === "all" || r.status === filter);
  const unpaid = (rows ?? []).filter((r) => r.status === "sent").reduce((s, r) => s + Number(r.total), 0);
  const paid = (rows ?? []).filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.total), 0);
  const valid = !!edit && (edit.client_name ?? "").trim().length >= 2 && (edit.items ?? []).some((i) => i.label.trim().length >= 2 && Number(i.qty) > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="À encaisser" value={fcfa(unpaid)} icon={Receipt} tone="warning" />
        <Stat label="Encaissé" value={fcfa(paid)} icon={CheckCircle2} tone="accent" />
        <Stat label="Factures" value={rows?.length ?? 0} icon={Receipt} tone="muted" />
      </div>
      <Section title="Factures" description="Numérotées automatiquement. Une facture émise ne se modifie plus : annulez-la et créez-en une nouvelle."
        action={<Button onClick={() => setEdit(empty())}><Plus className="w-4 h-4 mr-1" />Nouvelle facture</Button>}>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "draft", "sent", "paid", "cancelled"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "Toutes" : STATUS[f][0]}</Button>
          ))}
        </div>
        {rows === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <Empty icon={Receipt} title="Aucune facture" text="Créez une facture pour un client MIYASHI ou un client du comptoir, ou générez-la depuis un devis accepté." />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium"><span className="font-mono">{r.number}</span> · {r.client_name}</p>
                  <p className="text-xs text-muted-foreground">{dateFr(r.issued_at)}{r.due_date && r.status === "sent" ? ` · échéance ${dateFr(r.due_date)}` : ""}{r.status === "sent" && r.due_date && new Date(r.due_date) < new Date() ? " · en retard" : ""}</p>
                </div>
                <span className="font-semibold tabular-nums">{fcfa(r.total)}</span>
                <Badge variant={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
                <div className="flex gap-1">
                  {r.status === "draft" && <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEdit(r)}><Pencil className="w-4 h-4" /></Button>}
                  {r.status === "draft" && <Button size="icon" variant="ghost" aria-label="Émettre" onClick={() => setStatus(r, "sent", "Facture émise")}><Send className="w-4 h-4" /></Button>}
                  {r.status === "sent" && <Button size="sm" variant="outline" onClick={() => setStatus(r, "paid", "Facture marquée payée")}><CheckCircle2 className="w-4 h-4 mr-1" />Payée</Button>}
                  {r.status === "sent" && <Button size="icon" variant="ghost" aria-label="Annuler la facture" onClick={() => setStatus(r, "cancelled", "Facture annulée")}><XCircle className="w-4 h-4" /></Button>}
                  {r.status === "draft" && <Button size="icon" variant="ghost" aria-label="Supprimer le brouillon" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>}
                  <Button size="icon" variant="ghost" aria-label="Imprimer ou PDF" asChild><Link to={`/facture/${r.id}`} target="_blank"><Printer className="w-4 h-4" /></Link></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? `Brouillon ${edit.number}` : "Nouvelle facture"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Client MIYASHI (facultatif)</Label>
                  <Select value={edit.client_id ?? "none"} onValueChange={(v) => (v === "none" ? setEdit({ ...edit, client_id: null }) : pickClient(v))}>
                    <SelectTrigger><SelectValue placeholder="Client hors MIYASHI" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Client hors MIYASHI</SelectItem>{(clients ?? []).map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.full_name ?? "Client"}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Un client MIYASHI reçoit la facture dans son espace et une notification.</p>
                </div>
                <div><Label>Nom du client *</Label><Input value={edit.client_name ?? ""} maxLength={120} onChange={(e) => setEdit({ ...edit, client_name: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={edit.client_phone ?? ""} onChange={(e) => setEdit({ ...edit, client_phone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={edit.client_email ?? ""} onChange={(e) => setEdit({ ...edit, client_email: e.target.value })} /></div>
                <div><Label>Adresse</Label><Input value={edit.client_address ?? ""} onChange={(e) => setEdit({ ...edit, client_address: e.target.value })} /></div>
              </div>
              <div>
                <Label>Lignes</Label>
                <div className="space-y-2 mt-1">
                  {(edit.items ?? []).map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_70px_110px_auto] gap-2 items-center">
                      <Input aria-label="Désignation" placeholder="Désignation" value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} />
                      <Input aria-label="Quantité" type="number" min={0} step="any" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                      <Input aria-label="Prix unitaire" type="number" min={0} step={50} value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                      <Button size="icon" variant="ghost" aria-label="Retirer la ligne" disabled={(edit.items ?? []).length < 2} onClick={() => setEdit({ ...edit, items: (edit.items ?? []).filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setEdit({ ...edit, items: [...(edit.items ?? []), { label: "", qty: 1, unit_price: 0 }] })}><Plus className="w-4 h-4 mr-1" />Ajouter une ligne</Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Remise (FCFA)</Label><Input type="number" min={0} value={edit.discount ?? 0} onChange={(e) => setEdit({ ...edit, discount: Number(e.target.value) })} /></div>
                <div><Label>TVA (%)</Label><Input type="number" min={0} max={30} step="0.5" value={edit.vat_rate ?? 0} onChange={(e) => setEdit({ ...edit, vat_rate: Number(e.target.value) })} /></div>
                <div><Label>Échéance</Label><Input type="date" value={edit.due_date ?? ""} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} /></div>
              </div>
              <div><Label>Notes (conditions, moyen de paiement…)</Label><Textarea rows={2} maxLength={2000} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
                <p className="flex justify-between"><span>Sous-total</span><span>{fcfa(totals.sub)}</span></p>
                {totals.disc > 0 && <p className="flex justify-between"><span>Remise</span><span>− {fcfa(totals.disc)}</span></p>}
                <p className="flex justify-between"><span>TVA</span><span>{fcfa(totals.vat)}</span></p>
                <p className="flex justify-between font-bold text-base"><span>Total</span><span>{fcfa(totals.total)}</span></p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={!valid} onClick={() => save("draft")}>Enregistrer le brouillon</Button>
            <Button disabled={!valid} onClick={() => save("sent")}><Send className="w-4 h-4 mr-1" />Émettre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
