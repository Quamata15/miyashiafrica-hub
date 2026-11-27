// Seller tools: product options (variants #10, wholesale #21, origin country #30),
// statistics (#20), CSV import (#19) and team accounts (#22).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fcfa } from "@/lib/prefs";
import { errMsg } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Loader2, Plus, Settings2, Trash2, Upload, UserPlus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COUNTRY_OPTIONS } from "@/components/commerce/ProductExtras";

type P = { id: string; title: string; price: number; stock: number | null; is_active: boolean; min_order_qty: number; country: string; images: string[] | null };
type V = { id?: string; label: string; price: string; stock: string; sku: string };
type T = { min_qty: string; unit_price: string };

export function ProductOptions({ sellerId }: { sellerId: string }) {
  const [products, setProducts] = useState<P[]>([]);
  const [edit, setEdit] = useState<P | null>(null);
  const load = () => supabase.from("products").select("id, title, price, stock, is_active, min_order_qty, country, images").eq("seller_id", sellerId).is("deleted_at", null).order("created_at", { ascending: false }).then(({ data }) => setProducts(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">Ajoutez tailles et couleurs, prix de gros et pays d'expédition.</p><Button asChild size="sm"><Link to="/create?type=product"><Plus className="w-4 h-4 mr-1" />Nouveau produit</Link></Button></div>
      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3">
          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
          <div className="flex-1 min-w-0"><Link to={`/product/${p.id}`} className="font-medium hover:text-primary line-clamp-1">{p.title}</Link><p className="text-sm text-muted-foreground">{fcfa(p.price)} · stock {p.stock ?? 0}{!p.is_active && " · masqué"}</p></div>
          <Button variant="outline" size="sm" onClick={() => setEdit(p)}><Settings2 className="w-4 h-4 mr-1" />Options</Button>
        </div>
      ))}
      {!products.length && <p className="text-sm text-muted-foreground py-6 text-center">Aucun produit. Créez-en un ou importez un fichier.</p>}
      {edit && <OptionsDialog product={edit} onClose={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function OptionsDialog({ product, onClose }: { product: P; onClose: () => void }) {
  const [variants, setVariants] = useState<V[]>([]);
  const [tiers, setTiers] = useState<T[]>([]);
  const [minQty, setMinQty] = useState(String(product.min_order_qty));
  const [country, setCountry] = useState(product.country);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("product_variants").select("id, label, price, stock, sku").eq("product_id", product.id).order("sort_order").then(({ data }) =>
      setVariants((data ?? []).map((v) => ({ id: v.id, label: v.label, price: v.price == null ? "" : String(v.price), stock: String(v.stock), sku: v.sku ?? "" }))));
    supabase.from("product_price_tiers").select("min_qty, unit_price").eq("product_id", product.id).order("min_qty").then(({ data }) =>
      setTiers((data ?? []).map((t) => ({ min_qty: String(t.min_qty), unit_price: String(t.unit_price) }))));
  }, [product.id]);

  const save = async () => {
    setBusy(true);
    try {
      const keep = variants.filter((v) => v.label.trim());
      const existing = keep.filter((v) => v.id).map((v) => v.id!);
      const { data: old } = await supabase.from("product_variants").select("id").eq("product_id", product.id);
      const removed = (old ?? []).map((o) => o.id).filter((id) => !existing.includes(id));
      // Variants already ordered can't be deleted (orders keep a reference): deactivate instead.
      if (removed.length) await supabase.from("product_variants").update({ is_active: false }).in("id", removed);
      for (const [i, v] of keep.entries()) {
        const row = { product_id: product.id, label: v.label.trim(), price: v.price === "" ? null : Number(v.price), stock: Math.max(0, Number(v.stock) || 0), sku: v.sku || null, sort_order: i, is_active: true };
        const { error } = v.id ? await supabase.from("product_variants").update(row).eq("id", v.id) : await supabase.from("product_variants").insert(row);
        if (error) throw error;
      }
      await supabase.from("product_price_tiers").delete().eq("product_id", product.id);
      const tierRows = tiers.filter((t) => Number(t.min_qty) >= 2 && Number(t.unit_price) > 0).map((t) => ({ product_id: product.id, min_qty: Number(t.min_qty), unit_price: Number(t.unit_price) }));
      if (tierRows.length) { const { error } = await supabase.from("product_price_tiers").insert(tierRows); if (error) throw error; }
      const totalStock = keep.length ? keep.reduce((s, v) => s + (Number(v.stock) || 0), 0) : product.stock;
      const { error } = await supabase.from("products").update({ min_order_qty: Math.max(1, Number(minQty) || 1), country, has_variants: keep.length > 0, stock: totalStock }).eq("id", product.id);
      if (error) throw error;
      toast.success("Options enregistrées");
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Options de « {product.title} »</DialogTitle><DialogDescription>Prix de base : {fcfa(product.price)}. Laissez le prix d'une variante vide pour garder le prix de base.</DialogDescription></DialogHeader>
        <section className="space-y-2">
          <p className="font-medium">Variantes (taille, couleur, poids…)</p>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
              <Input placeholder="Rouge / XL" value={v.label} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Nom de la variante" />
              <Input placeholder="Prix" type="number" value={v.price} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} aria-label="Prix" />
              <Input placeholder="Stock" type="number" value={v.stock} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} aria-label="Stock" />
              <Input placeholder="Réf." value={v.sku} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} aria-label="Référence" />
              <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setVariants(variants.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setVariants([...variants, { label: "", price: "", stock: "0", sku: "" }])}><Plus className="w-4 h-4 mr-1" />Variante</Button>
        </section>
        <section className="space-y-2">
          <p className="font-medium">Prix de gros</p>
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>À partir de</span><Input type="number" className="w-24" value={t.min_qty} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, min_qty: e.target.value } : x)))} aria-label="Quantité minimum" />
              <span>pièces :</span><Input type="number" className="w-32" value={t.unit_price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, unit_price: e.target.value } : x)))} aria-label="Prix unitaire" /><span>F / pièce</span>
              <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setTiers([...tiers, { min_qty: "10", unit_price: String(Math.round(product.price * 0.9)) }])}><Plus className="w-4 h-4 mr-1" />Palier</Button>
        </section>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="o-min">Commande minimum</Label><Input id="o-min" type="number" min={1} value={minQty} onChange={(e) => setMinQty(e.target.value)} /></div>
          <div><Label htmlFor="o-country">Expédié depuis</Label><select id="o-country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3">{COUNTRY_OPTIONS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Stats = { views: number; visitors: number; orders: number; revenue: number; buyers: number; daily: { day: string; views: number; orders: number; revenue: number }[];
  top_products: { id: string; title: string; views: number; orders: number; revenue: number; stock: number | null }[] };

export function SellerStats({ sellerId }: { sellerId: string }) {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { supabase.rpc("get_seller_stats", { p_days: days, p_seller: sellerId }).then(({ data }) => setS(data as Stats)); }, [days, sellerId]);
  if (!s) return <Loader2 className="w-6 h-6 animate-spin" />;
  const conv = s.visitors ? ((s.buyers / s.visitors) * 100).toFixed(1) : "—";
  const kpis = [["Vues", s.views], ["Visiteurs", s.visitors], ["Commandes", s.orders], ["Chiffre d'affaires", fcfa(s.revenue)], ["Conversion", conv === "—" ? conv : `${conv} %`]];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} jours</Button>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{kpis.map(([k, v]) => <Card key={k as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold mt-1">{v}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle className="text-base">Vues et commandes par jour</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={s.daily.map((d) => ({ ...d, day: d.day.slice(5) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={32} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            <Bar dataKey="views" name="Vues" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" name="Commandes" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Meilleurs produits</CardTitle></CardHeader><CardContent className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Produit</th><th>Vues</th><th>Commandes</th><th>Conversion</th><th className="text-right">Ventes</th></tr></thead>
          <tbody>{s.top_products.map((p) => (
            <tr key={p.id} className="border-t border-foreground/10"><td className="py-2"><Link to={`/product/${p.id}`} className="hover:text-primary">{p.title}</Link></td><td>{p.views}</td><td>{p.orders}</td><td>{p.views ? `${((p.orders / p.views) * 100).toFixed(1)} %` : "—"}</td><td className="text-right">{fcfa(p.revenue)}</td></tr>
          ))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}

// Minimal CSV parser: commas or semicolons, quoted fields, "" escapes.
export function parseCsv(text: string): string[][] {
  const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); if (row.some((x) => x.trim())) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const COLS = ["title", "description", "price", "stock", "category", "location", "images"];
const TEMPLATE = "title;description;price;stock;category;location;images\nPagne wax 6 yards;Coton 100 %, motif fleurs;12000;20;mode;Lomé;https://exemple.com/photo1.jpg|https://exemple.com/photo2.jpg\n";

export function CsvImport() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ imported: number; errors: { line: number; error: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file?: File) => {
    if (!file) return;
    const table = parseCsv(await file.text());
    const header = table[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const missing = ["title", "price"].filter((c) => !header.includes(c));
    if (missing.length) return toast.error(`Colonnes manquantes : ${missing.join(", ")}`);
    const data = table.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
    if (data.length > 500) return toast.error("500 lignes maximum par fichier");
    setRows(data); setResult(null);
  };
  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("bulk_import_products", { p_rows: rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[c] ?? ""]))) });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setResult(data as typeof result); setRows([]);
    toast.success(`${(data as any).imported} produit(s) importé(s)`);
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" }));
    a.download = "modele-import-miyashi.csv"; a.click();
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Préparez un fichier CSV (Excel : « Enregistrer sous… CSV ») avec les colonnes <code>title, description, price, stock, category, location, images</code>. Catégorie : le nom ou le code de la catégorie. Images : liens https séparés par « | ».</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />Télécharger le modèle</Button>
        <label className="inline-flex items-center h-10 px-4 rounded-xl bg-primary text-primary-foreground font-medium cursor-pointer"><Upload className="w-4 h-4 mr-2" />Choisir le fichier<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /></label>
      </div>
      {rows.length > 0 && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-medium">{rows.length} ligne(s) prête(s). Aperçu :</p>
          <div className="overflow-x-auto"><table className="text-sm w-full min-w-[480px]"><thead><tr className="text-left text-muted-foreground"><th>Titre</th><th>Prix</th><th>Stock</th><th>Catégorie</th></tr></thead>
            <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i} className="border-t border-foreground/10"><td className="py-1">{r.title}</td><td>{r.price}</td><td>{r.stock}</td><td>{r.category}</td></tr>)}</tbody></table></div>
          <Button onClick={run} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Importer {rows.length} produit(s)</Button>
        </CardContent></Card>
      )}
      {result && (
        <div className="rounded-xl border border-foreground/10 p-4 text-sm">
          <p className="font-medium">{result.imported} produit(s) importé(s){result.errors.length ? `, ${result.errors.length} ligne(s) refusée(s) :` : "."}</p>
          <ul className="list-disc pl-5 text-muted-foreground">{result.errors.map((e) => <li key={e.line}>Ligne {e.line} : {e.error}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

type Member = { id: string; user_id: string; role: string; status: string; profile?: { full_name: string | null } };

export function TeamPanel({ shopId }: { shopId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const load = async () => {
    const { data } = await supabase.from("shop_members").select("id, user_id, role, status").eq("shop_id", shopId);
    const ids = (data ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length ? await supabase.from("profiles_public").select("user_id, full_name").in("user_id", ids) : { data: [] };
    setMembers((data ?? []).map((m) => ({ ...m, profile: (profiles ?? []).find((p) => p.user_id === m.user_id) })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [shopId]);
  const invite = async () => {
    const { error } = await supabase.rpc("invite_shop_member", { p_email: email, p_role: role });
    if (error) return toast.error(errMsg(error));
    toast.success("Invitation envoyée"); setEmail(""); load();
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Vos employés gèrent les produits et les commandes de la boutique avec leur propre compte. Le portefeuille et les retraits restent à vous.</p>
      <div className="flex flex-wrap gap-2">
        <Input type="email" placeholder="E-mail du compte MIYASHI" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[220px]" aria-label="E-mail" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" aria-label="Rôle"><option value="staff">Employé</option><option value="manager">Gérant</option></select>
        <Button onClick={invite} disabled={!email}><UserPlus className="w-4 h-4 mr-2" />Inviter</Button>
      </div>
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3">
          <div className="flex-1"><p className="font-medium">{m.profile?.full_name ?? "Membre"}</p><p className="text-xs text-muted-foreground">{m.role === "manager" ? "Gérant" : "Employé"}</p></div>
          <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status === "active" ? "Actif" : "Invité"}</Badge>
          <select value={m.role} onChange={async (e) => { await supabase.rpc("update_shop_member_role", { p_member_id: m.id, p_role: e.target.value }); load(); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm" aria-label="Changer le rôle"><option value="staff">Employé</option><option value="manager">Gérant</option></select>
          <Button variant="ghost" size="icon" aria-label="Retirer" onClick={async () => { await supabase.from("shop_members").delete().eq("id", m.id); load(); }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
}

/** Invitations the current user received to join someone's shop team. */
export function MyInvitations() {
  const { user } = useAuth();
  const [inv, setInv] = useState<{ shop_id: string; role: string; status: string; shop: { name: string; slug: string } | null }[]>([]);
  const load = () => user && supabase.from("shop_members").select("shop_id, role, status, shop:shops(name, slug)").eq("user_id", user.id).then(({ data }) => setInv((data ?? []) as any));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);
  const list = useMemo(() => inv, [inv]);
  if (!list.length) return null;
  return (
    <Card className="mb-6"><CardHeader><CardTitle className="text-base">Boutiques où vous travaillez</CardTitle></CardHeader><CardContent className="space-y-2">
      {list.map((i) => (
        <div key={i.shop_id} className="flex items-center gap-3">
          <Link to={`/boutique/${i.shop?.slug}`} className="flex-1 font-medium hover:text-primary">{i.shop?.name}</Link>
          <span className="text-sm text-muted-foreground">{i.role === "manager" ? "Gérant" : "Employé"}</span>
          {i.status === "invited" ? <Button size="sm" onClick={async () => { await supabase.rpc("accept_shop_invite", { p_shop_id: i.shop_id }); toast.success("Invitation acceptée"); load(); }}>Accepter</Button> : <Badge>Actif</Badge>}
        </div>
      ))}
    </CardContent></Card>
  );
}
