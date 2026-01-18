import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Briefcase,
  Download,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const ServicesList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Service supprimé");
      fetchServices();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(isActive ? "Service désactivé" : "Service activé");
      fetchServices();
    }
  };

  const exportServices = () => {
    const csv = [
      ["Titre", "Description", "Prix", "Type de prix", "Délai de livraison", "Statut"],
      ...services.map(s => [
        s.title,
        s.description || "",
        (s.price || 0).toString(),
        s.price_type || "",
        (s.delivery_days || 0).toString(),
        s.is_active ? "Actif" : "Inactif"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "services.csv";
    a.click();
    toast.success("Export téléchargé");
  };

  const filteredServices = services.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Mes services ({services.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportServices}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm" onClick={() => navigate("/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun service trouvé</p>
            <Button className="mt-4" onClick={() => navigate("/create")}>
              Ajouter un service
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {service.images && service.images[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{service.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {service.price ? `${service.price.toLocaleString()} FCFA` : "À définir"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {service.price_type === "fixed" ? "Fixe" : "Négociable"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {service.delivery_days ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {service.delivery_days}j
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(service.id, service.is_active || false)}>
                            {service.is_active ? "Désactiver" : "Activer"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteService(service.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicesList;
