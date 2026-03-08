import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, MapPin, Package, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const DriverQRScanner = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    if (!token.trim() || !user) return;
    setScanning(true);
    setError("");
    setResult(null);

    const { data, error: rpcError } = await supabase.rpc("scan_shipping_label" as any, {
      p_qr_token: token.trim(),
    });

    if (rpcError) {
      const msg = rpcError.message.includes("assigned driver")
        ? "Seul le livreur assigné peut scanner cette étiquette"
        : rpcError.message.includes("not found")
        ? "Étiquette introuvable. Vérifiez le code."
        : "Erreur lors du scan";
      setError(msg);
    } else {
      setResult(data);
      toast.success("Étiquette scannée avec succès !");
    }
    setScanning(false);
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          Scanner une étiquette
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Entrez le code QR de l'étiquette..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={handleScan} disabled={scanning || !token.trim()} size="sm">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scanner"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/5 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2 bg-accent/5 rounded-xl p-3 border border-accent/20">
            <div className="flex items-center gap-2 text-accent text-xs font-medium">
              <CheckCircle className="h-4 w-4" />
              Adresses révélées
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">RETRAIT</p>
                  <p className="text-xs font-medium">{result.pickup_address}</p>
                  {result.pickup_instructions && (
                    <p className="text-[10px] text-muted-foreground italic">{result.pickup_instructions}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">LIVRAISON</p>
                  <p className="text-xs font-medium">{result.delivery_address}</p>
                  {result.delivery_instructions && (
                    <p className="text-[10px] text-muted-foreground italic">{result.delivery_instructions}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverQRScanner;
