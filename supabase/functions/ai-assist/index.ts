// MIYASHI AI features for signed-in users:
//   describe_product  — writes a listing (title, description, category, tags) from photos  (#39)
//   suggest_price     — price range from similar listings, with a short explanation       (#40)
//   image_search      — turns a photo into search keywords                                 (#15)
//   support           — help assistant grounded in the FAQ and the user's own orders       (#43)
//   translate         — translates a chat message the user can read                        (#45)
import { adminClient, cors, getUser, json } from "../_shared/http.ts";
import { aiConfigured, askJSON, askText } from "../_shared/ai.ts";

const DAILY_LIMIT = 60;
const LANGS: Record<string, string> = {
  fr: "français", en: "anglais", ee: "éwé", yo: "yoruba", ha: "haoussa", wo: "wolof", tw: "twi", fon: "fon", bm: "bambara", pt: "portugais",
};

const isHttps = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u) && u.length < 2000;
const imageBlock = (img: string) => {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(img);
  if (m) {
    if (m[2].length > 6_000_000) throw new Error("Image trop lourde (4 Mo max)");
    return { type: "image" as const, source: { type: "base64" as const, media_type: m[1] as "image/jpeg", data: m[2] } };
  }
  if (isHttps(img)) return { type: "image" as const, source: { type: "url" as const, url: img } };
  throw new Error("Image invalide");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: "Connexion requise" }, 401);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const action = String(body.action ?? "");
  const db = adminClient();

  // suggest_price works without AI (statistics only).
  if (action === "suggest_price") return suggestPrice(db, body);

  if (!aiConfigured()) return json({ error: "L'assistant IA n'est pas encore activé sur MIYASHI.", code: "ai_not_configured" }, 503);

  const { count } = await db.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) return json({ error: "Limite quotidienne de l'assistant atteinte. Réessayez demain." }, 429);
  await db.from("ai_usage").insert({ user_id: user.id, action });

  try {
    switch (action) {
      case "describe_product": return json(await describeProduct(db, body));
      case "image_search": return json(await imageSearch(body));
      case "support": return json(await support(db, user.id, body));
      case "translate": return json(await translate(db, user.id, body));
      default: return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    console.error("ai-assist", action, e);
    return json({ error: e instanceof Error && e.message.length < 120 ? e.message : "L'assistant n'a pas pu répondre. Réessayez." }, 500);
  }
});

async function describeProduct(db: ReturnType<typeof adminClient>, body: Record<string, any>) {
  const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  if (!images.length) throw new Error("Ajoutez au moins une photo");
  const { data: cats } = await db.from("categories").select("slug, name").eq("type", "product");
  const hint = typeof body.hint === "string" ? body.hint.slice(0, 500) : "";
  const result = await askJSON<{ title: string; description: string; category_slug: string; tags: string[]; condition: string }>(
    `Tu rédiges des annonces pour MIYASHI, une marketplace d'Afrique de l'Ouest. Écris en français simple, concret et honnête :
ne décris que ce qui est visible sur les photos ou donné par le vendeur, sans inventer de marque, de taille ni de garantie.
Titre : 60 caractères maximum. Description : 3 à 6 phrases courtes, puis une liste de caractéristiques visibles.
Choisis la catégorie dans cette liste (slug) : ${(cats ?? []).map((c) => `${c.slug} (${c.name})`).join(", ")}.`,
    [...images.map(imageBlock), { type: "text", text: hint ? `Informations du vendeur : ${hint}` : "Rédige l'annonce." }],
    {
      type: "object", additionalProperties: false,
      required: ["title", "description", "category_slug", "tags", "condition"],
      properties: {
        title: { type: "string" }, description: { type: "string" }, category_slug: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        condition: { type: "string", enum: ["neuf", "comme neuf", "bon état", "usagé", "inconnu"] },
      },
    },
    { effort: "low", maxTokens: 3000 },
  );
  if (!result) throw new Error("L'assistant n'a pas pu décrire ces photos");
  const category = (cats ?? []).find((c) => c.slug === result.category_slug);
  return { ...result, title: result.title.slice(0, 150), category_slug: category ? category.slug : null };
}

async function suggestPrice(db: ReturnType<typeof adminClient>, body: Record<string, any>) {
  const title = String(body.title ?? "").trim().slice(0, 150);
  if (title.length < 3) return json({ error: "Indiquez un titre" }, 400);
  const words = title.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2).slice(0, 5);
  if (!words.length) return json({ enough_data: false, count: 0, message: "Titre trop court pour comparer." });
  let q = db.from("products").select("price, title").eq("is_active", true).is("deleted_at", null)
    .textSearch("title", words.join(" | "), { config: "french" }).limit(60);
  if (body.category_id) q = q.eq("category_id", body.category_id);
  const { data } = await q;
  const prices = (data ?? []).map((p) => Number(p.price)).filter((n) => n > 0).sort((a, b) => a - b);
  if (prices.length < 3) {
    return json({ enough_data: false, count: prices.length, message: "Pas encore assez d'annonces comparables sur MIYASHI pour suggérer un prix." });
  }
  const pick = (f: number) => prices[Math.min(prices.length - 1, Math.floor(f * (prices.length - 1)))];
  const round = (n: number) => (n >= 10000 ? Math.round(n / 500) * 500 : Math.round(n / 50) * 50);
  return json({ enough_data: true, count: prices.length, low: round(pick(0.25)), median: round(pick(0.5)), high: round(pick(0.75)),
    message: `Basé sur ${prices.length} annonces comparables sur MIYASHI.` });
}

async function imageSearch(body: Record<string, any>) {
  if (!body.image) throw new Error("Ajoutez une photo");
  const r = await askJSON<{ query: string; alternatives: string[] }>(
    "Tu aides à chercher un produit sur une marketplace d'Afrique de l'Ouest à partir d'une photo. Donne la requête de recherche la plus utile en français (2 à 5 mots, nom commun du produit, matière ou couleur si utile), et jusqu'à 3 variantes.",
    [imageBlock(String(body.image)), { type: "text", text: "Quel produit chercher ?" }],
    { type: "object", additionalProperties: false, required: ["query", "alternatives"],
      properties: { query: { type: "string" }, alternatives: { type: "array", items: { type: "string" } } } },
    { effort: "low", maxTokens: 1000 },
  );
  if (!r) throw new Error("Photo non reconnue");
  return r;
}

async function support(db: ReturnType<typeof adminClient>, userId: string, body: Record<string, any>) {
  const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = history
    .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") throw new Error("Posez votre question");
  while (messages.length && messages[0].role !== "user") messages.shift();

  const [{ data: faq }, { data: orders }, { data: wallet }] = await Promise.all([
    db.from("faq_items").select("question, answer").eq("is_active", true).order("sort_order").limit(80),
    db.from("orders").select("id, status, payment_status, payment_mode, total_price, delivery_status, created_at, product:products(title), service:services(title)")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
    db.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
  ]);
  const ordersText = (orders ?? []).map((o: any) =>
    `#${o.id.slice(0, 8)} — ${o.product?.title ?? o.service?.title ?? "article"} — ${o.total_price} FCFA — statut ${o.status}, paiement ${o.payment_status} (${o.payment_mode}), livraison ${o.delivery_status ?? "—"} — ${o.created_at.slice(0, 10)}`).join("\n");

  const system = `Tu es l'assistant d'aide de MIYASHI, la marketplace d'Afrique de l'Ouest (produits, services, freelances, livraison).
Réponds en français simple, en 2 à 6 phrases, avec des étapes concrètes dans l'application quand c'est utile.
Règles MIYASHI : le paiement est bloqué en séquestre jusqu'à la confirmation de réception ; libération automatique 7 jours après la remise sans litige ;
litige depuis « Mes litiges » ; paiement à la livraison avec un code à 6 chiffres à donner au livreur ; commission de 10 % ; recharge et paiement par mobile money via FedaPay.
N'invente jamais un remboursement, un délai ou une décision : pour un cas particulier, oriente vers un ticket support (page Support) ou un litige.
Ne demande jamais de mot de passe ni de code de remise. Si on te demande autre chose que MIYASHI, recentre poliment.

FAQ :
${(faq ?? []).map((f) => `Q: ${f.question}\nR: ${f.answer}`).join("\n\n").slice(0, 20000)}

Données de l'utilisateur connecté (à utiliser seulement si la question les concerne) :
Solde portefeuille : ${wallet?.balance ?? 0} FCFA
Dernières commandes :
${ordersText || "aucune"}`;

  const answer = await askText(system, messages, { effort: "low", maxTokens: 2000 });
  return { answer: answer ?? "Je ne peux pas répondre à cette question. Ouvrez un ticket depuis la page Support : l'équipe vous répondra." };
}

async function translate(db: ReturnType<typeof adminClient>, userId: string, body: Record<string, any>) {
  const lang = String(body.lang ?? "fr");
  if (!LANGS[lang]) throw new Error("Langue non prise en charge");
  const { data: msg } = await db.from("messages").select("id, content, sender_id, receiver_id").eq("id", body.message_id).maybeSingle();
  if (!msg || (msg.sender_id !== userId && msg.receiver_id !== userId)) throw new Error("Message introuvable");
  if (!msg.content?.trim()) throw new Error("Rien à traduire");
  const { data: cached } = await db.from("message_translations").select("content").eq("message_id", msg.id).eq("lang", lang).maybeSingle();
  if (cached) return { translation: cached.content, cached: true };
  const r = await askJSON<{ translation: string }>(
    `Traduis fidèlement le message en ${LANGS[lang]}. Garde les prix, nombres, noms propres et emojis. Ne réponds pas au message, traduis-le seulement.`,
    msg.content.slice(0, 4000),
    { type: "object", additionalProperties: false, required: ["translation"], properties: { translation: { type: "string" } } },
    { effort: "low", maxTokens: 3000 },
  );
  if (!r) throw new Error("Traduction impossible");
  await db.from("message_translations").upsert({ message_id: msg.id, lang, content: r.translation });
  return { translation: r.translation, cached: false };
}
