import { useEffect, useState } from "react";
import SimpleMarkdown from "./SimpleMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Action = "fixed" | "set_aside" | "untouched";
const ACTION_LABEL: Record<Action, string> = { fixed: "Corrigé", set_aside: "Mis de côté", untouched: "Non traité" };
const ACTION_VARIANT: Record<Action, "default" | "secondary" | "outline"> = { fixed: "default", set_aside: "secondary", untouched: "outline" };

interface LogRow {
  id: string; finding_id: string; finding_title: string | null; action: string;
  notes: string | null; admin_email: string | null; created_at: string;
}

const AdminSecurityPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [findings, setFindings] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [findingId, setFindingId] = useState("");
  const [title, setTitle] = useState("");
  const [action, setAction] = useState<Action>("fixed");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLogs = async () => {
    const { data } = await supabase.from("security_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    setLogs((data as LogRow[]) ?? []);
  };
  useEffect(() => { loadLogs(); }, []);

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysis("");
    const { data, error } = await supabase.functions.invoke("security-advisor", { body: { findings } });
    setAnalyzing(false);
    let message = (data as { error?: string })?.error;
    if (error && !message) {
      try { message = (await (error as { context?: Response }).context?.json())?.error; } catch { /* ignore */ }
    }
    if (error || message) {
      toast({ title: "Analyse impossible", description: message ?? "Erreur inconnue", variant: "destructive" });
      return;
    }
    setAnalysis((data as { analysis: string }).analysis);
  };

  const addLog = async () => {
    if (!findingId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("security_audit_log").insert({
      finding_id: findingId.trim(), finding_title: title.trim() || null, action,
      notes: notes.trim() || null, admin_id: user!.id, admin_email: user!.email ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }); return; }
    setFindingId(""); setTitle(""); setNotes("");
    loadLogs();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base md:text-lg flex items-center gap-2"><Sparkles className="w-4 h-4" /> Conseiller sécurité IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={5} value={findings} onChange={(e) => setFindings(e.target.value)}
            placeholder="Collez ici les résultats de l'analyse de sécurité…" />
          <Button onClick={analyze} disabled={analyzing || !findings.trim()}>
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyser les risques
          </Button>
          {analysis && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <SimpleMarkdown text={analysis} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base md:text-lg flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Journal d'audit sécurité</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Identifiant du problème" value={findingId} onChange={(e) => setFindingId(e.target.value)} />
            <Input placeholder="Titre (facultatif)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={action} onValueChange={(v) => setAction(v as Action)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABEL) as Action[]).map((a) => <SelectItem key={a} value={a}>{ACTION_LABEL[a]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Note (facultatif)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={addLog} disabled={saving || !findingId.trim()} variant="outline">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Ajouter au journal
          </Button>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Problème</TableHead><TableHead>Décision</TableHead>
                <TableHead className="hidden md:table-cell">Administrateur</TableHead><TableHead className="hidden md:table-cell">Note</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucune entrée</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: fr })}</TableCell>
                    <TableCell className="text-xs"><div className="font-medium">{l.finding_title ?? "—"}</div><div className="text-muted-foreground break-all">{l.finding_id}</div></TableCell>
                    <TableCell><Badge variant={ACTION_VARIANT[l.action as Action] ?? "outline"}>{ACTION_LABEL[l.action as Action] ?? l.action}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{l.admin_email}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{l.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurityPanel;
