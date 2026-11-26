// AI review of a new or edited listing (#42). Called by the database after save.
// Keyword rules already ran in the database; this adds a judgment on text + first photo.
// Does nothing (200) when ANTHROPIC_API_KEY is not set.
import { adminClient, json, isInternal } from "../_shared/http.ts";
import { aiConfigured, askJSON } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  if (!aiConfigured()) return json({ skipped: "ai_not_configured" });
  const { type, id } = await req.json().catch(() => ({}));
  if (!["products", "services"].includes(type) || typeof id !== "string") return json({ error: "bad request" }, 400);

  const db = adminClient();
  const { data: row } = await db.from(type).select("id, title, description, images, is_active").eq("id", id).maybeSingle();
  if (!row) return json({ skipped: "not_found" });

  const image = Array.isArray(row.images) ? row.images.find((u: string) => /^https:\/\//.test(u)) : null;
  const content: any[] = [];
  if (image) content.push({ type: "image", source: { type: "url", url: image } });
  content.push({ type: "text", text: `Titre : ${row.title}\nDescription : ${(row.description ?? "").slice(0, 4000)}` });

  try {
    const r = await askJSON<{ verdict: "ok" | "review" | "block"; reasons: string[] }>(
      `Tu modères les annonces d'une marketplace d'Afrique de l'Ouest. Classe l'annonce :
- "block" : produit illégal ou dangereux (armes, drogues, médicaments sur ordonnance, espèces protégées, faux documents, fausse monnaie, contenu sexuel, données personnelles volées), ou arnaque manifeste.
- "review" : doute raisonnable (contrefaçon probable, paiement hors plateforme demandé, prix ou promesse irréalistes, photo sans rapport).
- "ok" : annonce normale. La plupart des annonces sont "ok" ; ne bloque pas pour une faute d'orthographe ou un style maladroit.
Donne des raisons courtes en français.`,
      content,
      { type: "object", additionalProperties: false, required: ["verdict", "reasons"],
        properties: { verdict: { type: "string", enum: ["ok", "review", "block"] }, reasons: { type: "array", items: { type: "string" } } } },
      { effort: "low", maxTokens: 1500 },
    );
    if (!r || r.verdict === "ok") return json({ verdict: r?.verdict ?? "unknown" });
    await db.from("moderation_flags").insert({
      target_type: type === "products" ? "product" : "service", target_id: id, source: "ai",
      severity: r.verdict === "block" ? "high" : "medium", reasons: r.reasons.map((reason) => ({ reason })),
    });
    if (r.verdict === "block" && row.is_active) await db.from(type).update({ is_active: false }).eq("id", id);
    return json({ verdict: r.verdict });
  } catch (e) {
    console.error("moderate", id, e);
    return json({ error: "moderation failed" }, 500);
  }
});
