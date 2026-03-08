import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Shield, Award, Truck, MapPin, CheckCircle } from "lucide-react";

interface DriverBadgePrintProps {
  badgeNumber: string;
  driverName: string;
  zone: string;
  vehicleType: string;
  signedAt: string;
  badgeGeneratedAt: string;
}

const DriverBadgePrint = ({
  badgeNumber,
  driverName,
  zone,
  vehicleType,
  signedAt,
  badgeGeneratedAt,
}: DriverBadgePrintProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Badge Livreur MIYASHI - ${badgeNumber}</title>
          <style>
            @media print { body { margin: 0; } }
            body { font-family: 'Segoe UI', system-ui, sans-serif; display: flex; justify-content: center; padding: 20px; }
            .badge-card {
              width: 340px; border: 3px solid #1a1a2e; border-radius: 16px;
              overflow: hidden; background: #fff;
            }
            .badge-header {
              background: linear-gradient(135deg, #1a1a2e, #16213e);
              color: white; padding: 20px; text-align: center;
            }
            .badge-header h1 { margin: 0; font-size: 20px; letter-spacing: 2px; }
            .badge-header p { margin: 4px 0 0; font-size: 11px; opacity: 0.8; }
            .badge-body { padding: 20px; }
            .badge-number {
              text-align: center; font-size: 22px; font-weight: bold;
              letter-spacing: 3px; color: #1a1a2e; margin-bottom: 16px;
              padding: 10px; background: #f0f0f5; border-radius: 8px;
            }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
            .info-label { color: #666; }
            .info-value { font-weight: 600; }
            .commitments {
              margin-top: 16px; padding: 12px; background: #f8f9fa;
              border-radius: 8px; font-size: 11px; color: #555;
            }
            .commitments h4 { margin: 0 0 8px; font-size: 12px; color: #1a1a2e; }
            .commitments li { margin-bottom: 4px; }
            .badge-footer {
              text-align: center; padding: 12px; font-size: 10px;
              color: #999; border-top: 1px solid #eee;
            }
            .verified-badge {
              display: inline-flex; align-items: center; gap: 4px;
              background: #22c55e20; color: #16a34a; padding: 4px 10px;
              border-radius: 20px; font-size: 12px; font-weight: 600;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              <h3 className="font-display font-bold text-lg">Badge officiel</h3>
            </div>
            <Button onClick={handlePrint} className="bg-gradient-hero">
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </Button>
          </div>

          {/* Preview */}
          <div ref={printRef}>
            <div className="badge-card" style={{
              width: 340, border: "3px solid hsl(var(--primary))", borderRadius: 16,
              overflow: "hidden", background: "white", margin: "0 auto",
            }}>
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))",
                color: "white", padding: 20, textAlign: "center",
              }}>
                <h1 style={{ margin: 0, fontSize: 20, letterSpacing: 2, fontWeight: 800 }}>
                  🚚 MIYASHI
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.8 }}>
                  LIVREUR CERTIFIÉ
                </p>
              </div>

              {/* Body */}
              <div style={{ padding: 20 }}>
                <div style={{
                  textAlign: "center", fontSize: 22, fontWeight: "bold",
                  letterSpacing: 3, color: "hsl(var(--primary))", marginBottom: 16,
                  padding: 10, background: "hsl(var(--muted))", borderRadius: 8,
                }}>
                  {badgeNumber}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>Nom</span>
                  <span style={{ fontWeight: 600 }}>{driverName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>Zone</span>
                  <span style={{ fontWeight: 600 }}>{zone}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>Véhicule</span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{vehicleType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>Contrat signé</span>
                  <span style={{ fontWeight: 600 }}>{new Date(signedAt).toLocaleDateString("fr-FR")}</span>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  background: "#22c55e20", color: "#16a34a", padding: "6px 12px",
                  borderRadius: 20, fontSize: 12, fontWeight: 600, marginTop: 12,
                }}>
                  ✓ Identité vérifiée • Contrat signé
                </div>

                <div style={{
                  marginTop: 16, padding: 12, background: "#f8f9fa",
                  borderRadius: 8, fontSize: 11, color: "#555",
                }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700 }}>
                    Engagements signés :
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Serment de professionnalisme</li>
                    <li>Pas de coordonnées sur les colis</li>
                    <li>Loyauté envers la plateforme</li>
                    <li>Honnêteté et intégrité</li>
                    <li>Confidentialité des données</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                textAlign: "center", padding: 12, fontSize: 10,
                color: "#999", borderTop: "1px solid #eee",
              }}>
                Généré le {new Date(badgeGeneratedAt).toLocaleDateString("fr-FR")} •
                Ce badge est la propriété de MIYASHI
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Imprimez ce badge et gardez-le sur vous lors de vos livraisons.
            Il atteste de votre engagement et vous protège en cas de litige.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverBadgePrint;
