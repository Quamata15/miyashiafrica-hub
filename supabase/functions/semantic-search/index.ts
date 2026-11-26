// Public semantic product search (#44): "chaussures pour courir" also finds "baskets de sport".
// GET/POST {q, limit}. No API key needed (gte-small runs inside the edge runtime).
import { adminClient, cors, json } from "../_shared/http.ts";
import { embed } from "../_shared/embed.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const q = String(body.q ?? url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const limit = Math.min(Math.max(Number(body.limit ?? url.searchParams.get("limit") ?? 24) || 24, 1), 60);
  if (q.length < 2) return json({ results: [] });
  try {
    const vector = await embed(q);
    const { data, error } = await adminClient().rpc("semantic_search_products", {
      p_embedding: JSON.stringify(vector), p_count: limit, p_min_similarity: 0.75,
    });
    if (error) throw error;
    return json({ results: data ?? [] });
  } catch (e) {
    console.error("semantic-search", e);
    return json({ error: "Recherche indisponible" }, 500);
  }
});
