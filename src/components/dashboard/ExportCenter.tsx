import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, FileSpreadsheet, Receipt, Calculator, ScrollText, FileCheck } from "lucide-react";
import { exportOrdersCSV, exportDocumentPDF } from "@/utils/documentExport";
import { toast } from "sonner";

const ExportCenter = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    if (user) fetchData();
  }, [user, period]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("orders")
      .select("*, product:products(title), service:services(title)")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (period === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      query = query.gte("created_at", d.toISOString());
    } else if (period === "quarter") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      query = query.gte("created_at", d.toISOString());
    } else if (period === "year") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      query = query.gte("created_at", d.toISOString());
    }

    const [ordersRes, profileRes] = await Promise.all([
      query,
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  const sellerOrders = orders.filter((o) => o.seller_id === user?.id);
  const buyerOrders = orders.filter((o) => o.buyer_id === user?.id);
  const completedOrders = sellerOrders.filter((o) => o.status === "completed");
  const revenue = sellerOrders.reduce((s, o) => s + Number(o.total_price), 0);

  const periodLabels: Record<string, string> = {
    all: "Toutes les périodes",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année",
  };

  const handleExport = (type: "facture" | "devis" | "proforma" | "recu" | "rapport_fiscal") => {
    const data = type === "rapport_fiscal" ? sellerOrders : sellerOrders.length > 0 ? sellerOrders : buyerOrders;
    if (data.length === 0) {
      toast.error("Aucune commande à exporter pour cette période");
      return;
    }
    exportDocumentPDF(type, data, profile, { period: periodLabels[period] });
    toast.success(`${type === "rapport_fiscal" ? "Rapport fiscal" : "Document"} généré avec succès`);
  };

  const handleCSV = () => {
    const data = sellerOrders.length > 0 ? sellerOrders : orders;
    if (data.length === 0) {
      toast.error("Aucune commande à exporter");
      return;
    }
    exportOrdersCSV(data, "commandes_miyashi");
    toast.success("Export CSV téléchargé");
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Centre d'export & documents
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xl font-bold">{sellerOrders.length}</p>
            <p className="text-xs text-muted-foreground">Ventes</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xl font-bold text-accent">{revenue.toLocaleString()}F</p>
            <p className="text-xs text-muted-foreground">CA brut</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xl font-bold">{completedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </div>
        </div>

        {/* Document types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <DocumentCard
            icon={Receipt}
            title="Facture"
            description="Facture officielle pour vos ventes"
            onClick={() => handleExport("facture")}
            disabled={loading}
          />
          <DocumentCard
            icon={ScrollText}
            title="Devis"
            description="Devis estimatif pour vos clients"
            onClick={() => handleExport("devis")}
            disabled={loading}
          />
          <DocumentCard
            icon={FileCheck}
            title="Facture Proforma"
            description="Facture proforma avant paiement"
            onClick={() => handleExport("proforma")}
            disabled={loading}
          />
          <DocumentCard
            icon={FileText}
            title="Reçu de paiement"
            description="Justificatif de paiement reçu"
            onClick={() => handleExport("recu")}
            disabled={loading}
          />
          <DocumentCard
            icon={Calculator}
            title="Rapport fiscal"
            description="Synthèse TVA, commissions, CA"
            onClick={() => handleExport("rapport_fiscal")}
            disabled={loading}
            badge="Comptabilité"
          />
          <DocumentCard
            icon={FileSpreadsheet}
            title="Export CSV"
            description="Tableur de toutes les commandes"
            onClick={handleCSV}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const DocumentCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
  >
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm">{title}</p>
        {badge && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
  </button>
);

export default ExportCenter;
