// Help assistant (#43): answers from the FAQ and the user's own orders; hands off to a ticket.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { aiAssist, AiNotConfigured } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Loader2, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Où en est ma dernière commande ?", "Comment marche le paiement à la livraison ?", "Comment ouvrir un litige ?", "Comment retirer mon argent ?"];

export default function AiAssistant() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const { answer } = await aiAssist<{ answer: string }>("support", { messages: next });
      setMsgs([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      if (e instanceof AiNotConfigured) setOff(true);
      setMsgs([...next, { role: "assistant", content: e instanceof AiNotConfigured ? "L'assistant n'est pas encore activé. Consultez la FAQ ou ouvrez un ticket ci-dessous : l'équipe vous répondra." : (e as Error).message }]);
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bot className="w-5 h-5 text-primary" />Assistant MIYASHI</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!user ? <p className="text-sm text-muted-foreground"><Link to="/auth" className="text-primary underline">Connectez-vous</Link> pour poser vos questions : l'assistant peut alors suivre vos commandes.</p> : (<>
          <div className="max-h-96 overflow-y-auto space-y-3" aria-live="polite">
            {!msgs.length && <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="px-3 py-1.5 rounded-full border border-foreground/15 text-sm hover:border-primary/50">{s}</button>)}</div>}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
              </div>
            ))}
            {busy && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            <div ref={end} />
          </div>
          {!off && (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
              <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} placeholder="Posez votre question…" aria-label="Votre question" className="min-h-[44px]" />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Envoyer"><Send className="w-4 h-4" /></Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">L'assistant peut se tromper. Pour un remboursement ou un cas particulier, ouvrez un ticket ou un litige.</p>
        </>)}
      </CardContent>
    </Card>
  );
}
