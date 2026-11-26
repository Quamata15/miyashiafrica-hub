// Weekly logical backup (#49): exports the business tables as gzipped JSON to the private
// "backups" bucket, then re-downloads the file and checks the row counts (a tested backup).
// Keeps the last 8 exports. Supabase's own daily backups still apply on paid plans.
import { adminClient, json, isInternal } from "../_shared/http.ts";

const TABLES = ["profiles", "user_roles", "categories", "products", "product_variants", "product_price_tiers", "services", "shops", "shop_members",
  "orders", "order_codes", "payments", "escrow_transactions", "wallets", "wallet_transactions", "fedapay_transactions", "pending_checkouts",
  "delivery_requests", "driver_profiles", "disputes", "dispute_events", "reviews", "messages", "conversations", "notifications",
  "addresses", "price_offers", "savings_goals", "group_buys", "group_buy_participants", "bookings", "provider_availability", "quotes",
  "portfolio_items", "invoices", "kyc_documents", "promo_codes", "boosts", "delivery_zones", "pickup_points", "feature_flags",
  "site_banners", "site_content", "legal_documents", "faq_items", "favorites", "reports", "support_tickets", "freelance_profiles", "jobs", "applications"];

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  const db = adminClient();
  const { data: run } = await db.from("backup_runs").insert({}).select("id").single();
  try {
    const dump: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      const rows: unknown[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from(t).select("*").range(from, from + 999);
        if (error) { if (error.code === "42P01") break; throw new Error(`${t}: ${error.message}`); }
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      dump[t] = rows; counts[t] = rows.length;
    }
    const raw = new TextEncoder().encode(JSON.stringify({ created_at: new Date().toISOString(), tables: dump }));
    const gz = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    const path = `miyashi-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json.gz`;
    const up = await db.storage.from("backups").upload(path, gz, { contentType: "application/gzip" });
    if (up.error) throw up.error;

    // Verify: download, decompress, compare counts.
    const dl = await db.storage.from("backups").download(path);
    if (dl.error) throw dl.error;
    const back = JSON.parse(await new Response(dl.data.stream().pipeThrough(new DecompressionStream("gzip"))).text());
    const verified = TABLES.every((t) => (back.tables[t]?.length ?? 0) === counts[t]);

    await db.from("backup_runs").update({ finished_at: new Date().toISOString(), path, size_bytes: gz.byteLength, row_counts: counts, verified }).eq("id", run!.id);

    const { data: files } = await db.storage.from("backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
    const old = (files ?? []).filter((f) => f.name.startsWith("miyashi-")).slice(8).map((f) => f.name);
    if (old.length) await db.storage.from("backups").remove(old);
    return json({ path, size_bytes: gz.byteLength, verified });
  } catch (e) {
    console.error("backup-export", e);
    await db.from("backup_runs").update({ finished_at: new Date().toISOString(), error: String(e instanceof Error ? e.message : e).slice(0, 500) }).eq("id", run!.id);
    return json({ error: "backup failed" }, 500);
  }
});
