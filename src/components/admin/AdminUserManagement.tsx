import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Search, Eye, UserX, UserCheck, Download, Shield, Filter,
  ChevronLeft, ChevronRight, Users, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  users: any[];
  onRefresh: () => void;
}

const AdminUserManagement = ({ users, onRefresh }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<Map<string, string[]>>(new Map());
  const [userOrders, setUserOrders] = useState<Map<string, number>>(new Map());
  const [processing, setProcessing] = useState(false);
  const PER_PAGE = 15;

  useEffect(() => {
    if (users.length > 0) fetchRolesAndStats();
  }, [users]);

  const fetchRolesAndStats = async () => {
    const userIds = users.map(u => u.user_id);
    const [rolesRes, ordersRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase.from("orders").select("buyer_id").in("buyer_id", userIds),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of rolesRes.data || []) {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    }
    setUserRoles(roleMap);

    const orderMap = new Map<string, number>();
    for (const o of ordersRes.data || []) {
      orderMap.set(o.buyer_id, (orderMap.get(o.buyer_id) || 0) + 1);
    }
    setUserOrders(orderMap);
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    setProcessing(true);
    await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("user_id", userId);
    toast({ title: !currentStatus ? "Utilisateur vérifié ✅" : "Vérification retirée" });
    onRefresh();
    setProcessing(false);
    setSelectedUser(null);
  };

  const filtered = users.filter(u => {
    const matchSearch = !searchTerm || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) ||
      u.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchVerified = filterVerified === "all" || 
      (filterVerified === "verified" && u.is_verified) ||
      (filterVerified === "unverified" && !u.is_verified);
    return matchSearch && matchVerified;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const ROLE_LABELS: Record<string, string> = {
    buyer: "Acheteur", seller: "Vendeur", provider: "Prestataire",
    freelancer: "Freelance", employer: "Employeur", driver: "Livreur", admin: "Admin"
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Utilisateurs ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher nom, pseudo, tél..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterVerified} onValueChange={v => { setFilterVerified(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
                <SelectItem value="unverified">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Commandes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(u => {
                const roles = userRoles.get(u.user_id) || [];
                return (
                  <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(u)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {u.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">@{u.username || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {roles.map(r => (
                          <Badge key={r} variant="outline" className="text-[10px] px-1.5">
                            {ROLE_LABELS[r] || r}
                          </Badge>
                        ))}
                        {roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.location || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{userOrders.get(u.user_id) || 0}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_verified ? "default" : "outline"} className="text-xs">
                        {u.is_verified ? "✅ Vérifié" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "dd/MM/yy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/user/${u.user_id}`); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {selectedUser.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold">{selectedUser.full_name || "Utilisateur"}</p>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.phone || "Pas de téléphone"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Localisation</p>
                  <p className="font-medium">{selectedUser.location || "—"}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Commandes</p>
                  <p className="font-medium">{userOrders.get(selectedUser.user_id) || 0}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Rôles</p>
                  <p className="font-medium">
                    {(userRoles.get(selectedUser.user_id) || []).map(r => ROLE_LABELS[r] || r).join(", ") || "—"}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Inscrit le</p>
                  <p className="font-medium">{format(new Date(selectedUser.created_at), "dd MMM yyyy", { locale: fr })}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => navigate(`/user/${selectedUser.user_id}`)}>
                  <Eye className="w-4 h-4 mr-1" /> Voir profil
                </Button>
                <Button
                  variant={selectedUser.is_verified ? "outline" : "default"}
                  disabled={processing}
                  onClick={() => toggleVerification(selectedUser.user_id, selectedUser.is_verified)}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                    selectedUser.is_verified ? <UserX className="w-4 h-4 mr-1" /> : <UserCheck className="w-4 h-4 mr-1" />}
                  {selectedUser.is_verified ? "Retirer vérification" : "Vérifier"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminUserManagement;
