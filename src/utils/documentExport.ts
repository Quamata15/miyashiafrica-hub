import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderData {
  id: string;
  created_at: string;
  total_price: number;
  quantity: number;
  status: string;
  payment_status: string | null;
  product?: { title: string } | null;
  service?: { title: string } | null;
  buyer_id: string;
  seller_id: string;
  shipping_address?: string | null;
  tracking_number?: string | null;
}

interface ProfileData {
  full_name?: string | null;
  phone?: string | null;
  location?: string | null;
}

// ======== CSV Export ========
export function exportOrdersCSV(orders: OrderData[], filename: string = "commandes") {
  const headers = ["N° Commande", "Date", "Article", "Quantité", "Total (FCFA)", "Statut", "Paiement"];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    format(new Date(o.created_at), "dd/MM/yyyy", { locale: fr }),
    o.product?.title || o.service?.title || "N/A",
    o.quantity,
    o.total_price,
    o.status,
    o.payment_status || "—",
  ]);

  const csvContent = [headers, ...rows].map((row) => row.map((v) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; }).join(",")).join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}_${format(new Date(), "yyyyMMdd")}.csv`);
}

// ======== PDF Document Generator ========
type DocType = "facture" | "devis" | "proforma" | "recu" | "rapport_fiscal";

const DOC_TITLES: Record<DocType, string> = {
  facture: "FACTURE",
  devis: "DEVIS",
  proforma: "FACTURE PROFORMA",
  recu: "REÇU DE PAIEMENT",
  rapport_fiscal: "RAPPORT FISCAL",
};

export function generateDocumentHTML(
  type: DocType,
  orders: OrderData[],
  profile: ProfileData,
  options?: { period?: string; companyName?: string; nif?: string }
): string {
  const title = DOC_TITLES[type];
  const date = format(new Date(), "dd MMMM yyyy", { locale: fr });
  const docNumber = `${type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
  const total = orders.reduce((s, o) => s + o.total_price, 0);
  const taxRate = 0.18;
  const ht = total / (1 + taxRate);
  const tva = total - ht;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} ${docNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #d4a017; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 800; color: #d4a017; letter-spacing: 2px; }
  .logo-sub { font-size: 11px; color: #666; margin-top: 4px; }
  .doc-type { text-align: right; }
  .doc-type h1 { font-size: 24px; color: #d4a017; margin-bottom: 4px; }
  .doc-type .num { font-size: 13px; color: #666; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party { flex: 1; }
  .party h3 { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 1px; }
  .party p { font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f5f0e6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #d4a017; }
  tbody td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
  tbody tr:hover { background: #faf8f4; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.total { border-top: 2px solid #d4a017; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 700; color: #d4a017; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
  .stamp { margin-top: 30px; text-align: right; font-size: 12px; color: #666; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .badge-paid { background: #d4edda; color: #155724; }
  .badge-pending { background: #fff3cd; color: #856404; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">MIYASHI</div>
      <div class="logo-sub">Plateforme de commerce & services</div>
    </div>
    <div class="doc-type">
      <h1>${title}</h1>
      <div class="num">N° ${docNumber}</div>
      <div class="num">Date: ${date}</div>
      ${options?.period ? `<div class="num">Période: ${options.period}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Émetteur</h3>
      <p><strong>${options?.companyName || profile.full_name || "—"}</strong></p>
      <p>${profile.location || "—"}</p>
      <p>${profile.phone || ""}</p>
      ${options?.nif ? `<p>NIF: ${options.nif}</p>` : ""}
    </div>
    <div class="party" style="text-align: right;">
      <h3>Client / Plateforme</h3>
      <p><strong>MIYASHI</strong></p>
      <p>Lomé, Togo</p>
      <p>contact@miyashi.com</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Réf.</th>
        <th>Désignation</th>
        <th>Qté</th>
        <th>P.U. (FCFA)</th>
        <th>Total (FCFA)</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o) => `
      <tr>
        <td>#${o.id.slice(0, 8)}</td>
        <td>${o.product?.title || o.service?.title || "Prestation"}</td>
        <td>${o.quantity}</td>
        <td>${(o.total_price / o.quantity).toLocaleString("fr-FR")}</td>
        <td>${o.total_price.toLocaleString("fr-FR")}</td>
        <td><span class="badge ${o.payment_status === "paid" ? "badge-paid" : "badge-pending"}">${o.payment_status === "paid" ? "Payé" : "En attente"}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total HT</span><span>${Math.round(ht).toLocaleString("fr-FR")} FCFA</span></div>
    <div class="row"><span>TVA (18%)</span><span>${Math.round(tva).toLocaleString("fr-FR")} FCFA</span></div>
    ${type === "rapport_fiscal" ? `<div class="row"><span>Commission plateforme (10%)</span><span>${Math.round(total * 0.1).toLocaleString("fr-FR")} FCFA</span></div>` : ""}
    <div class="row total"><span>Total TTC</span><span>${total.toLocaleString("fr-FR")} FCFA</span></div>
  </div>

  ${type === "rapport_fiscal" ? `
  <div style="margin-top: 20px; padding: 16px; background: #f5f0e6; border-radius: 8px;">
    <h4 style="font-size: 13px; margin-bottom: 8px;">Résumé fiscal</h4>
    <p style="font-size: 12px; line-height: 1.6;">
      Nombre de transactions: <strong>${orders.length}</strong><br>
      Chiffre d'affaires brut: <strong>${total.toLocaleString("fr-FR")} FCFA</strong><br>
      TVA collectée (18%): <strong>${Math.round(tva).toLocaleString("fr-FR")} FCFA</strong><br>
      Commissions plateforme: <strong>${Math.round(total * 0.1).toLocaleString("fr-FR")} FCFA</strong><br>
      Revenu net estimé: <strong>${Math.round(total * 0.9 - tva).toLocaleString("fr-FR")} FCFA</strong>
    </p>
  </div>` : ""}

  <div class="stamp">
    ${type === "recu" ? "✅ Paiement reçu — Merci pour votre confiance" : ""}
    ${type === "devis" ? "Ce devis est valable 30 jours à compter de sa date d'émission." : ""}
    ${type === "proforma" ? "Ce document n'a pas valeur de facture définitive." : ""}
  </div>

  <div class="footer">
    <p>MIYASHI — Plateforme de commerce et services en Afrique de l'Ouest</p>
    <p>Document généré automatiquement le ${date}</p>
  </div>
</body>
</html>`;
}

export function exportDocumentPDF(
  type: DocType,
  orders: OrderData[],
  profile: ProfileData,
  options?: { period?: string; companyName?: string; nif?: string }
) {
  const html = generateDocumentHTML(type, orders, profile, options);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
