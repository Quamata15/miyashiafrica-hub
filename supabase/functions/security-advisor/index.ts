import { createClient } from "npm:@supabase/supabase-js@2";
import { createResponsesCall } from "../_shared/responses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
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

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return json({ error: "Connexion requise" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

  let findings = "";
  try {
    findings = String((await req.json())?.findings ?? "").trim();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  if (!findings) return json({ error: "Collez au moins un résultat d'analyse" }, 400);
  if (findings.length > 60000) return json({ error: "Texte trop long (60 000 caractères max)" }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "Lovable AI n'est pas configuré" }, 500);

  try {
    const { result } = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [{ role: "user", content: `Résultats d'analyse :\n\n${findings}` }],
      INSTRUCTIONS,
    );
    const text = await result.text;
    if (!text.trim()) return json({ error: "L'IA n'a pas renvoyé d'analyse." }, 502);
    return json({ analysis: text });
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode ?? 500;
    console.error("security-advisor error", status, e);
    const msg =
      status === 429 ? "Trop de demandes, réessayez dans un instant."
      : status === 402 ? "Crédits Lovable AI épuisés. Ajoutez des crédits dans les paramètres de l'espace de travail."
      : status === 403 ? "Accès à l'IA refusé pour cet espace de travail."
      : "L'analyse IA a échoué.";
    return json({ error: msg }, status >= 400 && status < 600 ? status : 500);
  }
});
