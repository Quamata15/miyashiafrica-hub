// Computes the embedding of a product for semantic search (#44).
// Body: {"product_id": "..."} (database trigger) or {"backfill": true} (fills missing ones, 100 at a time).
import { adminClient, json, isInternal } from "../_shared/http.ts";
import { embed } from "../_shared/embed.ts";

const textOf = (p: { title: string; description: string | null; location: string | null }) =>
  [p.title, p.description ?? "", p.location ?? ""].join("\n").trim();

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const db = adminClient();

  let products: { id: string; title: string; description: string | null; location: string | null }[] = [];
  if (typeof body.product_id === "string") {
    const { data } = await db.from("products").select("id, title, description, location").eq("id", body.product_id).maybeSingle();
    if (data) products = [data];
  } else if (body.backfill) {
    const { data: done } = await db.from("product_embeddings").select("product_id");
    const have = new Set((done ?? []).map((d) => d.product_id));
    const { data } = await db.from("products").select("id, title, description, location").is("deleted_at", null).limit(1000);
    products = (data ?? []).filter((p) => !have.has(p.id)).slice(0, 100);
  }

  let n = 0;
  for (const p of products) {
    const text = textOf(p);
    const h = await hash(text);
    const { data: existing } = await db.from("product_embeddings").select("content_hash").eq("product_id", p.id).maybeSingle();
    if (existing?.content_hash === h) continue;
    const vector = await embed(text);
    const { error } = await db.from("product_embeddings").upsert({
      product_id: p.id, embedding: JSON.stringify(vector), content_hash: h, updated_at: new Date().toISOString(),
    });
    if (error) console.error("embed upsert", p.id, error);
    else n++;
  }
  return json({ embedded: n });
});
