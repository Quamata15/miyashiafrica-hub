// Move one or several applications to a stage, optionally with a message to the candidates.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_TEMPLATES, fillTemplate, type Template } from "./templates";
import { STAGES, attempt } from "../kit";

export default function MoveDialog({ ids, stage, jobTitle, open, onOpenChange, onDone }: { ids: string[]; stage: string | null; jobTitle: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { user } = useAuth();
  const [target, setTarget] = useState(stage ?? "shortlisted");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTarget(stage ?? "shortlisted"); setMessage(""); setReason(""); } }, [open, stage]);
  useEffect(() => {
    if (!user || !open) return;
    supabase.from("recruiter_templates").select("id, name, kind, body").eq("owner_id", user.id).then(({ data }) => setTemplates([...(data ?? []) as Template[], ...DEFAULT_TEMPLATES]));
  }, [user?.id, open]);

  const go = async () => {
    setBusy(true);
    const ok = await attempt(() => supabase.rpc("move_applications", { p_ids: ids, p_stage: target, p_message: message.trim() || undefined, p_reason: target === "rejected" ? reason.trim() || undefined : undefined }),
      `${ids.length} candidature(s) déplacée(s) — les candidats sont prévenus`);
    setBusy(false);
    if (ok) { onDone(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Déplacer {ids.length} candidature(s)</DialogTitle><DialogDescription>Chaque candidat reçoit une notification avec l'étape et votre message.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Vers</Label><Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.filter((s) => s.key !== "withdrawn").map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex flex-wrap gap-1">{templates.map((t, i) => <Button key={t.id ?? i} type="button" size="sm" variant="outline" onClick={() => setMessage(fillTemplate(t.body, { poste: jobTitle }))}>{t.name}</Button>)}</div>
          <div><Label>Message au(x) candidat(s) (facultatif)</Label><Textarea rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          {target === "rejected" && <div><Label>Motif interne (non visible du candidat)</Label><Input maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expérience insuffisante en fiscalité" /></div>}
        </div>
        <DialogFooter><Button onClick={go} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirmer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
