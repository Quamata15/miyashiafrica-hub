// Creates a FedaPay transaction to top up the signed-in user's MIYASHI wallet
// and returns the hosted payment URL (mobile money or card).
import { createClient } from "npm:@supabase/supabase-js@2";
import { fedapay, unwrapTransaction } from "../_shared/fedapay.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const COUNTRY_BY_PREFIX: Record<string, string> = {
  "+228": "tg", "+229": "bj", "+225": "ci", "+221": "sn", "+223": "ml",
  "+226": "bf", "+227": "ne", "+224": "gn", "+237": "cm",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Connexion requise" }, 401);

  let body: { amount?: number; phone?: string; prefix?: string; return_path?: string };
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 100 || amount > 5_000_000) {
    return json({ error: "Montant invalide (100 à 5 000 000 FCFA)" }, 400);
  }
  const returnPath = typeof body.return_path === "string" && body.return_path.startsWith("/") && !body.return_path.startsWith("//")
    ? body.return_path.slice(0, 200) : "/wallet";

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
  const [firstname, ...rest] = (profile?.full_name || user.email?.split("@")[0] || "Client").trim().split(/\s+/);
  const lastname = rest.join(" ") || "MIYASHI";
  const digits = String(body.phone ?? profile?.phone ?? "").replace(/\D/g, "");
  const country = COUNTRY_BY_PREFIX[body.prefix ?? ""] ?? "tg";

  const { data: row, error: rowErr } = await admin.from("fedapay_transactions")
    .insert({ user_id: user.id, amount, return_path: returnPath }).select("id").single();
  if (rowErr) { console.error(rowErr); return json({ error: "Impossible de préparer le paiement" }, 500); }

  const siteUrl = (Deno.env.get("SITE_URL") ?? req.headers.get("origin") ?? "").replace(/\/$/, "");
  try {
    const created = unwrapTransaction(await fedapay("/transactions", {
      method: "POST",
      body: {
        description: `Recharge portefeuille MIYASHI (${amount} FCFA)`,
        amount,
        currency: { iso: "XOF" },
        callback_url: `${siteUrl}/wallet?topup=${row.id}`,
        merchant_reference: row.id,
        customer: {
          firstname, lastname,
          email: user.email,
          ...(digits.length >= 8 ? { phone_number: { number: digits, country } } : {}),
        },
      },
    }));
    const fedapayId = Number(created.id);
    await admin.from("fedapay_transactions").update({ fedapay_id: fedapayId }).eq("id", row.id);

    const token = await fedapay<{ token?: string; url?: string }>(`/transactions/${fedapayId}/token`, { method: "POST" });
    if (!token.url) throw new Error("No payment URL");
    return json({ payment_url: token.url, transaction_id: row.id });
  } catch (e) {
    console.error("fedapay-checkout", e);
    await admin.from("fedapay_transactions").update({ status: "failed" }).eq("id", row.id);
    return json({ error: "Le service de paiement est indisponible. Réessayez." }, 502);
  }
});
