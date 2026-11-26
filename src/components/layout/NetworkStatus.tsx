// Slow or lost connection banner (#13). Supabase calls already retry through React Query and the SDK.
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [back, setBack] = useState(false);
  useEffect(() => {
    const up = () => { setOnline(true); setBack(true); window.setTimeout(() => setBack(false), 3000); };
    const down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  if (online && !back) return null;
  return (
    <div role="status" aria-live="polite" className={`no-print fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] rounded-full px-4 py-2 text-sm shadow-elevated flex items-center gap-2 ${online ? "bg-accent text-accent-foreground" : "bg-foreground text-background"}`}>
      {!online && <WifiOff className="w-4 h-4" />}
      {online ? "Connexion rétablie" : "Pas de connexion : vos actions reprendront dès le retour du réseau"}
    </div>
  );
}
