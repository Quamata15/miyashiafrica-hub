// USSD and SMS access for basic phones (#37), compatible with Africa's Talking.
//   USSD callback URL : shown to admins in Admin → Exploitation (key stored in Vault as ussd_callback_key)
//   SMS callback URL  : same URL with &mode=sms  (keywords: SOLDE, CMD, PRIX <produit>, SUIVI <n°>)
// Read-only: balance, recent orders, prices, order tracking. The caller is matched by the phone
// number saved in the MIYASHI profile. Nothing can be bought or withdrawn from here.
import { adminClient, json, rateLimit } from "../_shared/http.ts";

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ")} F`;
const STATUS: Record<string, string> = { pending: "en attente", confirmed: "confirmee", processing: "en preparation", shipped: "expediee", delivered: "livree", completed: "terminee", cancelled: "annulee" };
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E\n]/g, "");

async function userByPhone(db: ReturnType<typeof adminClient>, phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const tail = digits.slice(-8);
  const { data } = await db.from("profiles").select("user_id, full_name, phone").ilike("phone", `%${tail.slice(-4)}`).limit(50);
  return (data ?? []).find((p) => String(p.phone ?? "").replace(/\D/g, "").endsWith(tail)) ?? null;
}

async function balance(db: any, uid: string) {
  const { data } = await db.from("wallets").select("balance").eq("user_id", uid).maybeSingle();
  return `Solde MIYASHI : ${fcfa(Number(data?.balance ?? 0))}`;
}
async function orders(db: any, uid: string) {
  const { data } = await db.from("orders").select("id, status, total_price, product:products(title), service:services(title)")
    .eq("buyer_id", uid).order("created_at", { ascending: false }).limit(3);
  if (!data?.length) return "Aucune commande.";
  return data.map((o: any) => `${o.id.slice(0, 6).toUpperCase()} ${(o.product?.title ?? o.service?.title ?? "").slice(0, 18)} ${fcfa(o.total_price)} ${STATUS[o.status] ?? o.status}`).join("\n");
}
async function prices(db: any, q: string) {
  const term = q.trim().slice(0, 40);
  if (term.length < 2) return "Indiquez un produit.";
  const { data } = await db.from("products").select("title, price, location").eq("is_active", true).is("deleted_at", null)
    .ilike("title", `%${term.replace(/[%_]/g, "")}%`).order("price").limit(4);
  if (!data?.length) return `Rien trouve pour "${term}".`;
  return data.map((p: any) => `${p.title.slice(0, 22)} ${fcfa(p.price)}${p.location ? " " + p.location.slice(0, 10) : ""}`).join("\n");
}
async function track(db: any, uid: string, ref: string) {
  const r = ref.trim().toLowerCase();
  if (!/^[0-9a-f]{6,8}$/.test(r)) return "Numero de commande invalide (6 caracteres).";
  const { data } = await db.from("orders").select("id, status, delivery_status, total_price").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
    .order("created_at", { ascending: false }).limit(50);
  const o = (data ?? []).find((x: any) => x.id.startsWith(r));
  if (!o) return "Commande introuvable.";
  return `Commande ${r.toUpperCase()} : ${STATUS[o.status] ?? o.status}${o.delivery_status ? ", livraison " + o.delivery_status : ""}, ${fcfa(o.total_price)}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const env = Deno.env.get("USSD_SECRET");
  const ok = (env && key === env) || (key.length >= 32 && (await adminClient().rpc("verify_ussd_key", { p_key: key })).data === true);
  if (!ok) return json({ error: "Unauthorized" }, 401);
  const form = await req.formData().catch(() => null);
  const get = (k: string) => String(form?.get(k) ?? url.searchParams.get(k) ?? "");
  const db = adminClient();
  const caller = (get("phoneNumber") || get("from")).replace(/\D/g, "");
  if (caller && !(await rateLimit(`ussd:${caller}`, 40, 3600))) return new Response("END Trop de demandes, réessayez plus tard.", { headers: { "Content-Type": "text/plain" } });
  const textResp = (s: string) => new Response(plain(s), { headers: { "Content-Type": "text/plain; charset=utf-8" } });

  if (url.searchParams.get("mode") === "sms") {
    const profile = await userByPhone(db, get("from"));
    const [kw, ...rest] = get("text").trim().split(/\s+/);
    const k = (kw ?? "").toUpperCase();
    let reply = "MIYASHI : envoyez SOLDE, CMD, PRIX <produit> ou SUIVI <numero>.";
    if (k === "PRIX") reply = await prices(db, rest.join(" "));
    else if (!profile && ["SOLDE", "CMD", "SUIVI"].includes(k)) reply = "Numero inconnu : ajoutez ce numero dans votre profil MIYASHI.";
    else if (k === "SOLDE") reply = await balance(db, profile!.user_id);
    else if (k === "CMD") reply = await orders(db, profile!.user_id);
    else if (k === "SUIVI") reply = await track(db, profile!.user_id, rest[0] ?? "");
    return json({ reply: plain(reply) });   // send it with your SMS provider's outbound API
  }

  // USSD: `text` is the whole input path, e.g. "", "1", "3*igname"
  const parts = get("text") ? get("text").split("*") : [];
  const profile = await userByPhone(db, get("phoneNumber"));
  const MENU = "CON MIYASHI\n1. Mon solde\n2. Mes commandes\n3. Prix d'un produit\n4. Suivre une commande";
  if (parts.length === 0) return textResp(MENU);
  const needAccount = "END Numero inconnu. Ajoutez ce numero dans votre profil sur miyashi.";
  switch (parts[0]) {
    case "1": return textResp(profile ? "END " + await balance(db, profile.user_id) : needAccount);
    case "2": return textResp(profile ? "END " + await orders(db, profile.user_id) : needAccount);
    case "3": return textResp(parts.length < 2 ? "CON Nom du produit :" : "END " + await prices(db, parts.slice(1).join(" ")));
    case "4":
      if (!profile) return textResp(needAccount);
      return textResp(parts.length < 2 ? "CON Numero de commande (6 caracteres) :" : "END " + await track(db, profile.user_id, parts[1]));
    default: return textResp("END Choix invalide.");
  }
});
