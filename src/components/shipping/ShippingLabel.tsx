import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Printer, Package, MapPin, Shield, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShippingLabelProps {
  orderId: string;
  orderRef: string;
  productTitle: string;
  quantity: number;
  sellerId: string;
  buyerId: string;
  pickupAddress?: string;
  deliveryAddress?: string;
}

const ShippingLabel = ({
  orderId,
  orderRef,
  productTitle,
  quantity,
  sellerId,
  buyerId,
  pickupAddress,
  deliveryAddress,
}: ShippingLabelProps) => {
  const { user } = useAuth();
  const [label, setLabel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isSeller = user?.id === sellerId;

  const generateLabel = async () => {
    if (!user) return;
    setGenerating(true);

    const { data, error } = await (supabase as any)
      .from("shipping_labels")
      .insert({
        order_id: orderId,
        seller_id: sellerId,
        buyer_id: buyerId,
        pickup_address: pickupAddress || "À définir par le vendeur",
        delivery_address: deliveryAddress || "À définir par l'acheteur",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Already exists, fetch it
        const { data: existing } = await (supabase as any)
          .from("shipping_labels")
          .select("*")
          .eq("order_id", orderId)
          .single();
        if (existing) setLabel(existing);
      } else {
        toast.error("Erreur lors de la génération de l'étiquette");
      }
    } else {
      setLabel(data);
      toast.success("Étiquette générée !");
    }
    setGenerating(false);
  };

  const fetchLabel = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("shipping_labels")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (data) setLabel(data);
    setLoading(false);
  };

  // Auto-fetch on mount
  useState(() => {
    fetchLabel();
  });

  const handlePrint = () => {
    const printContent = document.getElementById(`label-${orderId}`);
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Étiquette MIYASHI - ${orderRef}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .label { border: 2px solid #000; border-radius: 12px; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .qr { text-align: center; margin: 16px 0; padding: 16px; background: #f5f5f5; border-radius: 8px; }
          .qr-code { font-family: monospace; font-size: 14px; letter-spacing: 2px; word-break: break-all; }
          .info { margin: 8px 0; }
          .info-label { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
          .info-value { font-size: 14px; font-weight: 500; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 11px; text-align: center; }
          .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #888; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="logo">📦 MIYASHI</div>
            <div style="font-size: 12px; color: #666;">Étiquette d'expédition sécurisée</div>
          </div>
          <div class="qr">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">QR Token (à scanner par le livreur)</div>
            <div class="qr-code">${label?.qr_token || "---"}</div>
          </div>
          <div class="info">
            <div class="info-label">Commande</div>
            <div class="info-value">#${orderRef}</div>
          </div>
          <div class="info">
            <div class="info-label">Article</div>
            <div class="info-value">${productTitle} × ${quantity}</div>
          </div>
          <div class="warning">
            ⚠️ <strong>IMPORTANT</strong> : Ne pas inscrire de coordonnées personnelles sur le colis.
            Le livreur accède aux adresses via l'application MIYASHI uniquement.
            Tout contournement entraîne des sanctions.
          </div>
          <div class="footer">
            Plateforme MIYASHI — Transactions sécurisées
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!label && isSeller) {
    return (
      <Card className="border-2 border-dashed border-primary/30">
        <CardContent className="p-4 text-center space-y-3">
          <QrCode className="h-10 w-10 mx-auto text-primary/50" />
          <div>
            <p className="font-semibold text-sm">Étiquette d'expédition</p>
            <p className="text-xs text-muted-foreground">
              Générez une étiquette MIYASHI pour ce colis. Le livreur scannera le QR code pour accéder aux adresses.
            </p>
          </div>
          <Button onClick={generateLabel} disabled={generating} size="sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
            Générer l'étiquette
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!label) return null;

  // Mask address for seller (they shouldn't see buyer's full address)
  const maskedDeliveryAddress = isSeller
    ? (label.delivery_address?.split(",")[0] || "Adresse masquée") + " ••••"
    : label.delivery_address;

  return (
    <Card className="border-0 shadow-card" id={`label-${orderId}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          Étiquette d'expédition
          {label.scanned_at && (
            <Badge className="bg-accent/10 text-accent text-[10px]">
              <CheckCircle className="h-3 w-3 mr-0.5" /> Scanné
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* QR Token */}
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">TOKEN QR</p>
          <p className="font-mono text-sm font-bold tracking-widest text-primary">
            {label.qr_token}
          </p>
        </div>

        {/* Addresses */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">RETRAIT</p>
              <p className="text-xs font-medium">{label.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-3 w-3 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">LIVRAISON</p>
              <p className="text-xs font-medium">{maskedDeliveryAddress}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Warning */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2.5">
          <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Ne pas inscrire de coordonnées sur le colis
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Le livreur accède aux adresses via l'app. Tout contournement entraîne un avertissement.
          </p>
        </div>

        {/* Actions */}
        {isSeller && (
          <Button variant="outline" size="sm" className="w-full" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer l'étiquette
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ShippingLabel;
