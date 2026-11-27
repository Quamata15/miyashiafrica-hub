// Reusable messages for candidates. {poste} is replaced by the job title.
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_TEMPLATES, type Template } from "./templates";
import { Section, attempt } from "../kit";

const KINDS: Record<Template["kind"], string> = { invite: "Présélection", interview: "Entretien", offer: "Proposition", reject: "Refus", custom: "Autre" };

export default function Templates() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Template[]>([]);
  const [draft, setDraft] = useState<Template>({ name: "", kind: "custom", body: "" });
  const load = () => user && supabase.from("recruiter_templates").select("id, name, kind, body").eq("owner_id", user.id).order("created_at").then(({ data }) => setRows((data ?? []) as Template[]));
  useEffect(() => { load(); }, [user?.id]);

  const add = async (t: Template) => { if (user && await attempt(() => supabase.from("recruiter_templates").insert({ owner_id: user.id, name: t.name.trim(), kind: t.kind, body: t.body.trim() }), "Modèle enregistré")) { setDraft({ name: "", kind: "custom", body: "" }); load(); } };
  const update = async (t: Template) => { if (t.id && await attempt(() => supabase.from("recruiter_templates").update({ name: t.name, kind: t.kind, body: t.body }).eq("id", t.id!), "Modèle mis à jour")) load(); };
  const remove = async (t: Template) => { if (t.id && await attempt(() => supabase.from("recruiter_templates").delete().eq("id", t.id!), "Modèle supprimé")) load(); };
  const setRow = (i: number, patch: Partial<Template>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Section title="Messages types" description="Répondez à chaque candidat, vite et poliment. Écrivez {poste} pour insérer l'intitulé de l'offre.">
      {rows.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-foreground/20 p-4 text-sm">
          <p className="mb-2">Commencez avec nos modèles :</p>
          <Button size="sm" variant="outline" onClick={async () => { for (const t of DEFAULT_TEMPLATES) await add(t); }}><MessageSquareText className="w-4 h-4 mr-1" />Importer les 4 modèles</Button>
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((t, i) => (
          <li key={t.id} className="rounded-xl border border-foreground/10 p-3 space-y-2">
            <div className="flex gap-2"><Input aria-label="Nom du modèle" value={t.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <Select value={t.kind} onValueChange={(v) => setRow(i, { kind: v as Template["kind"] })}><SelectTrigger className="w-40" aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <Textarea aria-label="Texte du modèle" rows={3} maxLength={2000} value={t.body} onChange={(e) => setRow(i, { body: e.target.value })} />
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => update(t)}><Save className="w-4 h-4 mr-1" />Enregistrer</Button><Button size="sm" variant="ghost" aria-label="Supprimer le modèle" onClick={() => remove(t)}><Trash2 className="w-4 h-4" /></Button></div>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl border border-foreground/10 p-3 space-y-2">
        <p className="text-sm font-medium">Nouveau modèle</p>
        <div className="flex gap-2"><Input aria-label="Nom du nouveau modèle" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nom" />
          <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as Template["kind"] })}><SelectTrigger className="w-40" aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <Textarea aria-label="Texte du nouveau modèle" rows={3} maxLength={2000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Bonjour, merci pour votre candidature au poste de {poste}…" />
        <Button size="sm" disabled={draft.name.trim().length < 2 || draft.body.trim().length < 2} onClick={() => add(draft)}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
    </Section>
  );
}
