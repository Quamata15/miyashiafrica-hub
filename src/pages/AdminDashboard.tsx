import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, Users, Package, AlertTriangle, DollarSign,
  FileText, BarChart3, Loader2, Flag, Eye
} from "lucide-react";
import { motion } from "framer-motion";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminKYCPanel from "@/components/admin/AdminKYCPanel";
import AdminReportsPanel from "@/components/admin/AdminReportsPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0, disputes: 0, pendingKyc: 0, pendingReports: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("verify_admin_access" as any);
    const admin = data === true && !error;
    setIsAdmin(admin);
    setChecking(false);
    if (admin) fetchAllData();
  };

  const fetchAllData = async () => {
    const [profilesRes, ordersRes, disputesRes, kycRes, reportsRes] = await Promise.all([
      supabase.from("profiles").select("*").limit(100),
      supabase.from("orders").select("*, product:products(title), service:services(title)").order("created_at", { ascending: false }).limit(100),
      (supabase.from("disputes") as any).select("*").order("created_at", { ascending: false }),
      supabase.from("kyc_documents").select("*").order("submitted_at", { ascending: false }),
      (supabase.from("reports") as any).select("*").order("created_at", { ascending: false }),
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    if (ordersRes.data) {
      setOrders(ordersRes.data);
      const revenue = ordersRes.data.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      setStats(prev => ({ ...prev, orders: ordersRes.data!.length, revenue }));
    }
    if (disputesRes.data) {
      setDisputes(disputesRes.data);
      setStats(prev => ({ ...prev, disputes: disputesRes.data.length }));
    }
    if (kycRes.data) {
      setKycDocs(kycRes.data);
      setStats(prev => ({ ...prev, pendingKyc: kycRes.data.filter((d: any) => d.status === "pending").length }));
    }
    if (reportsRes.data) {
      setReports(reportsRes.data);
      setStats(prev => ({ ...prev, pendingReports: reportsRes.data.filter((r: any) => r.status === "pending").length }));
    }
    setStats(prev => ({ ...prev, users: profilesRes.data?.length || 0 }));
  };

  const updateDisputeStatus = async (disputeId: string, status: string, resolution?: string) => {
    await (supabase.from("disputes") as any).update({ status, resolution }).eq("id", disputeId);
    toast({ title: "Litige mis à jour" });
    fetchAllData();
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-warm">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24">
          <Card className="max-w-md border-0 shadow-elevated text-center">
            <CardContent className="p-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-display font-bold mb-2">Accès refusé</h2>
              <p className="text-muted-foreground">Vous n'avez pas les droits administrateur.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const statCards = [
    { label: "Utilisateurs", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Commandes", value: stats.orders, icon: Package, color: "text-secondary" },
    { label: "Revenus", value: `${stats.revenue.toLocaleString()}F`, icon: DollarSign, color: "text-accent" },
    { label: "Litiges", value: stats.disputes, icon: AlertTriangle, color: "text-destructive" },
    { label: "KYC en attente", value: stats.pendingKyc, icon: FileText, color: "text-info" },
    { label: "Signalements", value: stats.pendingReports, icon: Flag, color: "text-secondary" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-display font-bold">Administration MIYASHI</h1>
                <p className="text-muted-foreground">Panneau de contrôle central</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                      <s.icon className={`w-7 h-7 ${s.color}`} />
                      <div>
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Tabs defaultValue="stats" className="space-y-6">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50">
                <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-1" /> Stats</TabsTrigger>
                <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" /> Utilisateurs</TabsTrigger>
                <TabsTrigger value="orders"><Package className="w-4 h-4 mr-1" /> Commandes</TabsTrigger>
                <TabsTrigger value="kyc"><FileText className="w-4 h-4 mr-1" /> KYC{stats.pendingKyc > 0 && <Badge className="ml-1 text-[10px] px-1">{stats.pendingKyc}</Badge>}</TabsTrigger>
                <TabsTrigger value="reports"><Flag className="w-4 h-4 mr-1" /> Signalements{stats.pendingReports > 0 && <Badge className="ml-1 text-[10px] px-1">{stats.pendingReports}</Badge>}</TabsTrigger>
                <TabsTrigger value="disputes"><AlertTriangle className="w-4 h-4 mr-1" /> Litiges</TabsTrigger>
              </TabsList>

              <TabsContent value="stats">
                <AdminAnalytics />
              </TabsContent>

              <TabsContent value="users">
                <Card className="border-0 shadow-card">
                  <CardHeader><CardTitle>Utilisateurs ({users.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Pseudo</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Localisation</TableHead>
                            <TableHead>Vérifié</TableHead>
                            <TableHead>Inscrit le</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map(u => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{u.username || "—"}</TableCell>
                              <TableCell>{u.phone || "—"}</TableCell>
                              <TableCell>{u.location || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={u.is_verified ? "default" : "outline"}>
                                  {u.is_verified ? "Oui" : "Non"}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(u.created_at), "dd/MM/yy", { locale: fr })}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/user/${u.user_id}`)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card className="border-0 shadow-card">
                  <CardHeader><CardTitle>Commandes récentes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Article</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Paiement</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map(o => (
                            <TableRow key={o.id}>
                              <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                              <TableCell>{(o.product as any)?.title || (o.service as any)?.title || "—"}</TableCell>
                              <TableCell className="font-semibold">{o.total_price?.toLocaleString()}F</TableCell>
                              <TableCell><Badge>{o.status}</Badge></TableCell>
                              <TableCell><Badge variant="outline">{o.payment_status}</Badge></TableCell>
                              <TableCell>{format(new Date(o.created_at), "dd/MM/yy", { locale: fr })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kyc">
                <AdminKYCPanel docs={kycDocs} onRefresh={fetchAllData} />
              </TabsContent>

              <TabsContent value="reports">
                <AdminReportsPanel reports={reports} onRefresh={fetchAllData} />
              </TabsContent>

              <TabsContent value="disputes">
                <Card className="border-0 shadow-card">
                  <CardHeader><CardTitle>Litiges & Réclamations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {disputes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun litige en cours</p>
                      ) : disputes.map(d => (
                        <Card key={d.id} className="border shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <p className="font-medium">{d.reason}</p>
                                <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Commande: #{d.order_id?.slice(0, 8)} • {format(new Date(d.created_at), "dd/MM/yy", { locale: fr })}
                                </p>
                              </div>
                              <Badge className={
                                d.status === "resolved" ? "bg-accent text-accent-foreground" :
                                d.status === "closed" ? "bg-muted text-muted-foreground" :
                                "bg-secondary text-secondary-foreground"
                              }>{d.status}</Badge>
                            </div>
                            {d.status !== "resolved" && d.status !== "closed" && (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" onClick={() => updateDisputeStatus(d.id, "resolved", "refund")}>
                                  Rembourser
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateDisputeStatus(d.id, "resolved", "no_refund")}>
                                  Rejeter
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateDisputeStatus(d.id, "resolved", "partial_refund")}>
                                  Remb. partiel
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
