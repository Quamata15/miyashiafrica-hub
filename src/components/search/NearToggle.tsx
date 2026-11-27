// "Near me (25 km)" chip shown above product and service results.
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { NEAR_KM, type NearPos } from "@/hooks/useNearMe";

type Near = { pos: NearPos | null; asking: boolean; useGps: () => Promise<void> };

export default function NearToggle({ near, active, onlyNear, setOnlyNear, nearCount, what }: {
  near: Near; active: boolean; onlyNear: boolean; setOnlyNear: (v: boolean) => void; nearCount: number; what: string;
}) {
  const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors";
  if (!near.pos) {
    return (
      <button type="button" onClick={() => near.useGps()} className={`${chip} border-foreground/15 text-muted-foreground hover:border-primary/50`}>
        {near.asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}Voir ce qui est près de moi
      </button>
    );
  }
  const where = near.pos.source === "gps" ? "votre position" : near.pos.city || "votre ville";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {nearCount > 0 ? (
        <button type="button" aria-pressed={onlyNear} onClick={() => setOnlyNear(!onlyNear)}
          className={`${chip} ${active ? "border-primary bg-primary/10 text-foreground" : "border-foreground/15 text-muted-foreground"}`}>
          <MapPin className="h-3.5 w-3.5 text-primary" />{active ? `À moins de ${NEAR_KM} km de ${where} (${nearCount})` : `Seulement à moins de ${NEAR_KM} km (${nearCount})`}
        </button>
      ) : (
        <span className={`${chip} border-foreground/10 text-muted-foreground`}><MapPin className="h-3.5 w-3.5" />Aucun {what} à moins de {NEAR_KM} km : les plus proches d'abord</span>
      )}
      {near.pos.source !== "gps" && (
        <button type="button" onClick={() => near.useGps()} className={`${chip} border-foreground/15 text-muted-foreground hover:border-primary/50`}>
          {near.asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}Position précise
        </button>
      )}
    </div>
  );
}
