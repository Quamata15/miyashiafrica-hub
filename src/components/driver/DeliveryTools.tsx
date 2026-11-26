// Driver tools: proof of delivery (#27) and multi-parcel rounds (#29).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, fileToDataUrl } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Eraser, Loader2, Route } from "lucide-react";

type Delivery = { id: string; order_id: string; status: string; pickup_location: any; delivery_location: any; pickup_address: string | null; delivery_address: string | null };

function SignaturePad({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    c.width = c.offsetWidth * 2; c.height = 320;
    ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  }, []);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent) => { drawing.current = true; const [x, y] = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); ref.current!.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const [x, y] = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); dirty.current = true; };
  const up = () => { drawing.current = false; if (dirty.current) ref.current!.toBlob((b) => onChange(b), "image/png"); };
  const clear = () => { const c = ref.current!; const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); dirty.current = false; onChange(null); };
  return (
    <div>
      <canvas ref={ref} className="w-full h-40 rounded-xl border border-foreground/15 touch-none bg-white" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Zone de signature" />
      <Button type="button" variant="ghost" size="sm" onClick={clear}><Eraser className="w-4 h-4 mr-1" />Effacer</Button>
    </div>
  );
}

export function ProofOfDeliveryDialog({ delivery, onDone, onClose }: { delivery: Delivery; onDone: () => void; onClose: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [sig, setSig] = useState<Blob | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsCode, setNeedsCode] = useState(true);
  useEffect(() => {
    supabase.from("orders").select("product_id").eq("id", delivery.order_id).maybeSingle().then(({ data }) => setNeedsCode(!!data?.product_id));
  }, [delivery.order_id]);

  const submit = async () => {
    if (!photo) return toast.error("Prenez une photo du colis remis");
    setBusy(true);
    try {
      const up = async (blob: Blob, name: string) => {
        const path = `${delivery.id}/${Date.now()}-${name}`;
        const { error } = await supabase.storage.from("delivery-proofs").upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (error) throw error;
        return path;
      };
      // Re-encode as a light JPEG (also converts iPhone HEIC photos).
      const jpeg = await (await fetch(await fileToDataUrl(photo, 1600))).blob();
      const photoPath = await up(jpeg, "photo.jpg");
      const sigPath = sig ? await up(sig, "signature.png") : undefined;
      const coords = await new Promise<GeolocationCoordinates | null>((res) =>
        navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res(p.coords), () => res(null), { timeout: 8000 }) : res(null));
      const { data, error } = await supabase.rpc("submit_delivery_proof", {
        p_delivery_id: delivery.id, p_photo_path: photoPath, p_signature_path: sigPath, p_code: code || undefined, p_recipient: name || undefined,
        p_lat: coords?.latitude, p_lng: coords?.longitude,
      });
      if (error) throw error;
      const r = data as { success: boolean; error?: string; attempts_left?: number };
      if (!r.success) throw new Error(`${r.error}${r.attempts_left != null ? ` (${r.attempts_left} essais restants)` : ""}`);
      toast.success("Livraison confirmée avec preuve");
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Preuve de livraison</DialogTitle><DialogDescription>Photo du colis remis, code du client et signature : en cas de litige, c'est votre protection.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-foreground/20 p-4 cursor-pointer">
            {photo ? <img src={URL.createObjectURL(photo)} alt="Photo de preuve" className="w-20 h-20 rounded-lg object-cover" /> : <Camera className="w-8 h-8 text-primary" />}
            <span className="text-sm">{photo ? "Changer la photo" : "Prendre la photo du colis remis *"}</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          {needsCode && (
            <div><Label htmlFor="pod-code">Code de remise du client *</Label>
              <Input id="pod-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl tracking-[0.5em] font-mono h-14" placeholder="••••••" /></div>
          )}
          <div><Label htmlFor="pod-name">Nom de la personne qui reçoit</Label><Input id="pod-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Signature</Label><SignaturePad onChange={setSig} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy || !photo || (needsCode && code.length !== 6)}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmer la livraison</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const hav = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, r = Math.PI / 180;
  const d = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(d));
};
const stopOf = (d: Delivery) => (d.status === "accepted" ? d.pickup_location : d.delivery_location) as { lat: number; lng: number } | null;

/** Orders the chosen deliveries by nearest neighbour from the driver's position and opens the route. */
export function RoutePlanner({ deliveries, position }: { deliveries: Delivery[]; position: { lat: number; lng: number } | null }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (deliveries.length < 2) return null;

  const plan = async () => {
    setBusy(true);
    let cur = position ?? stopOf(deliveries.find((d) => chosen.includes(d.id))!) ?? { lat: 6.13, lng: 1.22 };
    const left = deliveries.filter((d) => chosen.includes(d.id));
    const ordered: Delivery[] = []; let km = 0;
    while (left.length) {
      left.sort((a, b) => (stopOf(a) ? hav(cur, stopOf(a)!) : 9e9) - (stopOf(b) ? hav(cur, stopOf(b)!) : 9e9));
      const next = left.shift()!; ordered.push(next);
      if (stopOf(next)) { km += hav(cur, stopOf(next)!); cur = stopOf(next)!; }
    }
    const { error } = await supabase.rpc("create_delivery_route", { p_ordered: ordered.map((d) => d.id), p_total_km: Math.round(km * 10) / 10 });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    const pts = ordered.map((d) => { const s = stopOf(d); return s ? `${s.lat},${s.lng}` : encodeURIComponent((d.status === "accepted" ? d.pickup_address : d.delivery_address) ?? ""); });
    const dest = pts.pop();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}${pts.length ? `&waypoints=${pts.join("|")}` : ""}&travelmode=driving`, "_blank");
    toast.success(`Tournée de ${ordered.length} arrêts, environ ${Math.round(km)} km à vol d'oiseau`);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setChosen(deliveries.map((d) => d.id)); setOpen(true); }}><Route className="w-4 h-4 mr-1" />Planifier une tournée</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tournée multi-colis</DialogTitle><DialogDescription>Choisissez les livraisons : l'ordre le plus court depuis votre position est calculé, puis l'itinéraire s'ouvre dans Google Maps.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {deliveries.map((d) => (
              <label key={d.id} className="flex items-start gap-3 rounded-lg border border-foreground/10 p-2 text-sm cursor-pointer">
                <Checkbox checked={chosen.includes(d.id)} onCheckedChange={(v) => setChosen(v ? [...chosen, d.id] : chosen.filter((x) => x !== d.id))} className="mt-0.5" />
                <span>{d.status === "accepted" ? "Retrait : " : "Livraison : "}{(d.status === "accepted" ? d.pickup_address : d.delivery_address) ?? "adresse GPS"}</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button onClick={plan} disabled={busy || chosen.length < 2}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Calculer et ouvrir l'itinéraire</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
