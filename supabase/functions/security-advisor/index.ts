import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const INSTRUCTIONS = `Tu es un conseiller en sécurité défensive pour MIYASHI, une marketplace africaine (React + base de données Postgres avec règles d'accès par ligne).
L'administrateur te colle des résultats d'analyse de sécurité. Réponds en français, en Markdown, avec :
1. **Résumé** — 2 à 4 phrases sur le niveau de risque global.
2. **Risques par priorité** — pour chaque problème : gravité (Critique/Élevé/Moyen/Faible), ce qui peut arriver concrètement, qui est concerné.
3. **Correctifs recommandés** — étapes défensives précises et ordonnées (règles d'accès, validation côté serveur, mises à jour de dépendances…).
4. **Ce qui peut rester tel quel** — éléments probablement voulus (ex. catalogue public).
Ne fournis jamais de code d'exploitation ni d'instructions d'attaque. Reste concis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return json({ error: "Connexion requise" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

  let findings = "";
  try {
    findings = String((await req.json())?.findings ?? "").trim();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  if (!findings) return json({ error: "Collez au moins un résultat d'analyse" }, 400);
  if (findings.length > 60000) return json({ error: "Texte trop long (60 000 caractères max)" }, 400);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "L'IA n'est pas configurée (ANTHROPIC_API_KEY)" }, 500);
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: `Résultats d'analyse :\n\n${findings}` }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") return json({ error: "L'IA a refusé d'analyser ce contenu." }, 422);
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text).join("\n").trim();
    if (!text) return json({ error: "L'IA n'a pas renvoyé d'analyse." }, 502);
    return json({ analysis: text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Trop de demandes, réessayez dans un instant." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Clé IA invalide." }, 500);
    console.error("security-advisor error", e);
    return json({ error: "L'analyse IA a échoué." }, 500);
  }
});
