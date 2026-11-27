// "Use my position": reads the GPS point once (with the person's permission).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function LocateButton({ value, onLocate, label = "Utiliser ma position" }: {
  value?: { lat: number | null; lng: number | null } | null; onLocate: (lat: number, lng: number) => void; label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!("geolocation" in navigator)) return toast.error("Position non disponible sur cet appareil");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onLocate(Math.round(p.coords.latitude * 1e4) / 1e4, Math.round(p.coords.longitude * 1e4) / 1e4); toast.success("Position enregistrée : pensez à sauvegarder"); },
      () => { setBusy(false); toast.error("Position refusée ou introuvable"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const has = value?.lat != null && value?.lng != null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={locate} disabled={busy}>
      {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : has ? <Check className="w-4 h-4 mr-1.5 text-emerald-500" /> : <LocateFixed className="w-4 h-4 mr-1.5" />}
      {has ? "Position GPS enregistrée" : label}
    </Button>
  );
}
