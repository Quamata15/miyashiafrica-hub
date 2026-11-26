// Generic admin editor for simple settings tables (zones, pickup points, banners, rates…).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export type Field = {
  key: string; label: string; type?: "text" | "number" | "bool" | "textarea" | "date" | "datetime" | "select";
  options?: [string, string][]; required?: boolean; hideInList?: boolean; placeholder?: string;
  /** Turns the typed value into what is stored (e.g. an e-mail into a user id). */
  toDb?: (v: any) => Promise<any> | any;
};

type Row = Record<string, any>;

export default function CrudTable({ table, fields, pk = "id", order, defaults = {}, canDelete = true, canCreate = true }: {
  table: string; fields: Field[]; pk?: string; order?: string; defaults?: Row; canDelete?: boolean; canCreate?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const db = supabase as any;

  const load = async () => {
    let q = db.from(table).select("*").limit(500);
    if (order) q = q.order(order);
    const { data, error } = await q;
    if (error) toast.error(error.message); else setRows(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table]);

  const save = async () => {
    if (!edit) return;
    const row: Row = {};
    for (const f of fields) {
      let v = edit[f.key];
      if (f.type === "number") v = v === "" || v == null ? null : Number(v);
      if ((f.type === "date" || f.type === "datetime") && !v) v = null;
      if (f.required && (v == null || v === "")) return toast.error(`${f.label} est requis`);
      if (f.toDb) { try { v = await f.toDb(v); } catch (e) { return toast.error((e as Error).message); } }
      row[f.key] = v;
    }
    const { error } = isNew ? await db.from(table).insert({ ...defaults, ...row }) : await db.from(table).update(row).eq(pk, edit[pk]);
    if (error) return toast.error(error.message);
    toast.success("Enregistré"); setEdit(null); load();
  };
  const remove = async (r: Row) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    const { error } = await db.from(table).delete().eq(pk, r[pk]);
    if (error) return toast.error(error.message);
    load();
  };
  const show = (f: Field, v: any) => (f.type === "bool" ? (v ? "Oui" : "Non") : f.options ? (f.options.find(([k]) => k === v)?.[1] ?? v) : v == null || v === "" ? "—" : String(v).slice(0, 80));
  const listed = fields.filter((f) => !f.hideInList);

  return (
    <div className="space-y-3">
      {canCreate && <Button size="sm" onClick={() => { setIsNew(true); setEdit({ ...defaults }); }}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>}
      <div className="overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-muted-foreground">{listed.map((f) => <th key={f.key} className="p-2 font-medium">{f.label}</th>)}<th className="w-20" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[pk]} className="border-t border-foreground/10">
                {listed.map((f) => <td key={f.key} className="p-2 align-top">{show(f, r[f.key])}</td>)}
                <td className="p-2 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => { setIsNew(false); setEdit({ ...r }); }}><Pencil className="w-4 h-4" /></Button>
                  {canDelete && <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={listed.length + 1} className="p-6 text-center text-muted-foreground">Aucune ligne</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Ajouter" : "Modifier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {edit && fields.map((f) => (
              <div key={f.key}>
                {f.type === "bool" ? (
                  <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{f.label}</span><Switch checked={!!edit[f.key]} onCheckedChange={(v) => setEdit({ ...edit, [f.key]: v })} /></label>
                ) : (<>
                  <Label htmlFor={`f-${f.key}`}>{f.label}{f.required && " *"}</Label>
                  {f.type === "textarea" ? <Textarea id={`f-${f.key}`} rows={8} value={edit[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                    : f.type === "select" ? <select id={`f-${f.key}`} value={edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3">{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    : <Input id={`f-${f.key}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"} placeholder={f.placeholder}
                        value={f.type === "datetime" && edit[f.key] ? String(edit[f.key]).slice(0, 16) : edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />}
                </>)}
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
