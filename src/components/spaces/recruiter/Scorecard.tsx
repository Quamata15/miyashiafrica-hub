// Structured interview evaluation: each criterion 1-5, a recommendation, private notes.
// The same grid for every candidate makes interviews fairer and easier to compare.
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stars } from "./CandidateDrawer";
import { attempt } from "../kit";

export const CRITERIA = ["Compétences techniques", "Expérience pertinente", "Communication", "Motivation", "Adéquation au poste"];
export type ScorecardData = { criteria: Record<string, number>; average?: number; recommendation?: string };

export default function Scorecard({ interviewId, initial, notes: initialNotes, complete, onSaved }: { interviewId: string; initial: ScorecardData | null; notes?: string | null; complete: boolean; onSaved?: () => void }) {
  const [criteria, setCriteria] = useState<Record<string, number>>(initial?.criteria ?? {});
  const [reco, setReco] = useState(initial?.recommendation ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const values = Object.values(criteria).filter(Boolean);
  const average = values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : undefined;

  const save = async () => {
    setBusy(true);
    const ok = await attempt(() => supabase.rpc("save_interview_scorecard", { p_id: interviewId, p_scorecard: { criteria, average, recommendation: reco || undefined }, p_notes: notes || undefined, p_complete: complete }), "Évaluation enregistrée");
    setBusy(false);
    if (ok) onSaved?.();
  };
  return (
    <div className="space-y-3">
      {CRITERIA.map((c) => (
        <div key={c} className="flex items-center justify-between gap-3 text-sm"><span>{c}</span><Stars value={criteria[c] ?? null} onChange={(v) => setCriteria({ ...criteria, [c]: v })} /></div>
      ))}
      <p className="text-sm">Moyenne : <b>{average ?? "—"}</b>/5</p>
      <div><Label>Recommandation</Label><Select value={reco} onValueChange={setReco}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent><SelectItem value="Recommandé">Recommandé</SelectItem><SelectItem value="À revoir">À revoir</SelectItem><SelectItem value="Non recommandé">Non recommandé</SelectItem></SelectContent></Select></div>
      <div><Label>Notes privées</Label><Textarea rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Faits observés, exemples cités, points à vérifier" /></div>
      <p className="text-xs text-muted-foreground">Évaluez des faits liés au poste, jamais l'âge, l'apparence, l'accent ou la situation personnelle.</p>
      <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer l'évaluation</Button>
    </div>
  );
}
