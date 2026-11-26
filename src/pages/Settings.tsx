// Preferences and privacy: currency (#5), notification channels (#36 #38), translation language (#45),
// data saver (#50), data export and cookies (#48).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrefs } from "@/lib/prefs";
import PageShell from "@/components/layout/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { resetCookieConsent } from "@/components/layout/CookieConsent";

const LANGS: [string, string][] = [["fr", "Français"], ["en", "Anglais"], ["ee", "Éwé"], ["fon", "Fon"], ["yo", "Yoruba"], ["ha", "Haoussa"], ["wo", "Wolof"], ["tw", "Twi"], ["bm", "Bambara"], ["pt", "Portugais"]];

export default function Settings() {
  const { user } = useAuth();
  const { currency, currencies, setCurrency, dataSaver, setDataSaver } = usePrefs();
  const [p, setP] = useState({ email_notifications: true, whatsapp_notifications: false, whatsapp_number: "", language: "fr" });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("email_notifications, whatsapp_notifications, whatsapp_number, language").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setP({ email_notifications: data.email_notifications, whatsapp_notifications: data.whatsapp_notifications, whatsapp_number: data.whatsapp_number ?? "", language: data.language }));
  }, [user]);

  const save = async (patch: Partial<typeof p>) => {
    if (!user) return;
    const next = { ...p, ...patch };
    setP(next);
    if (patch.language) { try { localStorage.setItem("miyashi_lang", patch.language); } catch { /* ignore */ } }
    const { data } = await supabase.from("user_preferences").update(patch).eq("user_id", user.id).select("id");
    if (!data?.length) await supabase.from("user_preferences").insert({ user_id: user.id, ...patch });
    toast.success("Préférence enregistrée");
  };

  const exportData = async () => {
    setExporting(true);
    const { data, error } = await supabase.rpc("export_my_data");
    setExporting(false);
    if (error) return toast.error("Export impossible");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `miyashi-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <PageShell title="Préférences et confidentialité">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle className="text-lg">Affichage</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label htmlFor="cur">Afficher aussi les prix en</Label>
            <select id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Les paiements restent en FCFA ; l'équivalent est indicatif.</p></div>
          <label className="flex items-center justify-between gap-4"><span><span className="font-medium block">Mode économie de données</span><span className="text-sm text-muted-foreground">Images plus légères, pas d'animations. Activé automatiquement sur réseau 2G.</span></span>
            <Switch checked={dataSaver} onCheckedChange={setDataSaver} /></label>
          <div><Label htmlFor="lang">Langue de traduction des messages</Label>
            <select id="lang" value={p.language} onChange={(e) => save({ language: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1">{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <p className="text-xs text-muted-foreground mt-1">Le bouton « Traduire » de la messagerie traduit dans cette langue.</p></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-lg">Notifications</CardTitle></CardHeader><CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4"><span><span className="font-medium block">Par e-mail</span><span className="text-sm text-muted-foreground">Commandes, paiements, offres, devis, litiges.</span></span>
            <Switch checked={p.email_notifications} onCheckedChange={(v) => save({ email_notifications: v })} /></label>
          <label className="flex items-center justify-between gap-4"><span><span className="font-medium block">Par WhatsApp</span><span className="text-sm text-muted-foreground">Les mêmes alertes sur votre WhatsApp.</span></span>
            <Switch checked={p.whatsapp_notifications} onCheckedChange={(v) => save({ whatsapp_notifications: v })} /></label>
          {p.whatsapp_notifications && (
            <div className="flex gap-2"><Input type="tel" placeholder="+228 90 00 00 00" value={p.whatsapp_number} onChange={(e) => setP({ ...p, whatsapp_number: e.target.value })} aria-label="Numéro WhatsApp" />
              <Button onClick={() => save({ whatsapp_number: p.whatsapp_number })}>Enregistrer</Button></div>
          )}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-lg">Mes données</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Téléchargez tout ce que MIYASHI conserve sur vous : profil, commandes, messages, portefeuille…</p>
            <Button variant="outline" onClick={exportData} disabled={exporting}>{exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Exporter mes données</Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Choix des cookies de mesure d'audience.</p>
            <Button variant="outline" onClick={() => { resetCookieConsent(); toast.message("Vous pouvez refaire votre choix en bas de l'écran"); }}>Modifier mes cookies</Button>
          </div>
          <p className="text-sm text-muted-foreground">Supprimer le compte : <Link to="/profile" className="text-primary underline">Profil → Supprimer mon compte</Link>. Documents : <Link to="/terms" className="text-primary underline">conditions et confidentialité</Link>.</p>
        </CardContent></Card>
      </div>
    </PageShell>
  );
}
