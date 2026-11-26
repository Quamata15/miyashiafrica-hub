// Health check every 10 minutes (#49): database, auth, storage, edge runtime, website.
// Results feed the public /status page; admins get a notification after two failed checks in a row.
import { adminClient, json, isInternal } from "../_shared/http.ts";

async function timed(fn: () => Promise<void>) {
  const t = performance.now();
  try { await fn(); return { ok: true, latency_ms: Math.round(performance.now() - t) }; }
  catch (e) { return { ok: false, latency_ms: Math.round(performance.now() - t), detail: String(e instanceof Error ? e.message : e).slice(0, 300) }; }
}
const mustOk = async (r: Response) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); await r.body?.cancel(); };

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  const db = adminClient();
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const site = Deno.env.get("SITE_URL") ?? "https://miyashiafrica-hub.vercel.app";

  const checks: Record<string, () => Promise<void>> = {
    "Base de données": async () => { const { error } = await db.from("categories").select("id", { head: true, count: "exact" }); if (error) throw error; },
    "Connexion": async () => mustOk(await fetch(`${base}/auth/v1/health`, { headers: { apikey: anon } })),
    "Fichiers et photos": async () => { const { error } = await db.storage.from("product-media").list("", { limit: 1 }); if (error) throw error; },
    "Paiements (serveur)": async () => mustOk(await fetch(`${base}/functions/v1/fedapay-webhook`, { method: "OPTIONS" })),
    "Site web": async () => mustOk(await fetch(site, { redirect: "follow" })),
  };

  const rows = [];
  for (const [component, fn] of Object.entries(checks)) rows.push({ component, ...(await timed(fn)) });
  await db.from("status_checks").insert(rows);

  for (const r of rows.filter((x) => !x.ok)) {
    const { data: last } = await db.from("status_checks").select("ok").eq("component", r.component).order("checked_at", { ascending: false }).limit(3);
    if (last && last.length >= 2 && !last[0].ok && !last[1].ok && (last.length < 3 || last[2].ok)) {
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) await db.from("notifications").insert(admins.map((a) => ({
        user_id: a.user_id, type: "security", title: `Incident : ${r.component}`,
        message: `${r.component} ne répond plus depuis 2 vérifications (${r.detail ?? "erreur"}).`, data: { component: r.component },
      })));
    }
  }
  return json({ checks: rows });
});
