// "Ma boutique": everything a seller (or a team member) manages in one place.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/components/layout/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShopSettings from "@/components/seller/ShopSettings";
import { CsvImport, MyInvitations, ProductOptions, SellerStats, TeamPanel } from "@/components/seller/SellerTools";
import OrdersTable from "@/components/dashboard/OrdersTable";
import type { Tables } from "@/integrations/supabase/types";
import { useSpaces } from "@/hooks/useSpaces";
import { SpaceLocked } from "@/components/spaces/SpaceAccess";

export default function ShopManage() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Tables<"shops"> | null | undefined>(undefined);
  const [workFor, setWorkFor] = useState<{ owner_id: string; name: string }[]>([]);
  const [actingFor, setActingFor] = useState<string | null>(null);
  const [invited, setInvited] = useState(0);
  const sp = useSpaces();
  const seller = sp.can("sell");

  useEffect(() => {
    if (!user) return;
    supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => setShop(data));
    supabase.from("shop_members").select("shop:shops(owner_id, name)").eq("user_id", user.id).eq("status", "active")
      .then(({ data }) => setWorkFor(((data ?? []).map((d: any) => d.shop).filter(Boolean))));
    supabase.from("shop_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "invited").then(({ count }) => setInvited(count ?? 0));
  }, [user]);

  if (!user || shop === undefined || sp.loading) return <PageShell title="Ma boutique"><div /></PageShell>;
  // Team members manage the shops they work for without holding the seller space themselves.
  if (!seller && !workFor.length) return <PageShell title="Ma boutique">{invited > 0 && <MyInvitations />}<SpaceLocked feature="sell" className="mt-4" /></PageShell>;
  const sellerId = actingFor ?? (seller ? user.id : workFor[0].owner_id);
  const isOwner = sellerId === user.id;

  return (
    <PageShell wide title="Ma boutique" description="Votre vitrine, vos produits, vos chiffres et votre équipe."
      actions={workFor.length ? (
        <select value={sellerId} onChange={(e) => setActingFor(e.target.value === user.id ? null : e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" aria-label="Boutique gérée">
          {seller && <option value={user.id}>Ma boutique</option>}{workFor.map((w) => <option key={w.owner_id} value={w.owner_id}>{w.name} (équipe)</option>)}
        </select>) : undefined}>
      <MyInvitations />
      <Tabs defaultValue={isOwner && !shop ? "settings" : "products"}>
        <TabsList className="flex-wrap h-auto">
          {isOwner && <TabsTrigger value="settings">Boutique</TabsTrigger>}
          <TabsTrigger value="products">Produits et options</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          {isOwner && shop && <TabsTrigger value="team">Équipe</TabsTrigger>}
        </TabsList>
        {isOwner && <TabsContent value="settings" className="mt-3"><ShopSettings shop={shop} onSaved={setShop} /></TabsContent>}
        <TabsContent value="products" className="mt-3"><ProductOptions sellerId={sellerId} /></TabsContent>
        <TabsContent value="orders" className="mt-3"><OrdersTable sellerId={sellerId} /></TabsContent>
        <TabsContent value="stats" className="mt-3"><SellerStats sellerId={sellerId} /></TabsContent>
        <TabsContent value="import" className="mt-3">{isOwner ? <CsvImport /> : <p className="text-sm text-muted-foreground">L'import en masse est réservé au propriétaire de la boutique.</p>}</TabsContent>
        {isOwner && shop && <TabsContent value="team" className="mt-3"><TeamPanel shopId={shop.id} /></TabsContent>}
      </Tabs>
    </PageShell>
  );
}
